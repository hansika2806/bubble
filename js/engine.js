// ═══════════════════════════════════════════════════════════════
//  engine.js — AdaptiveEngine + generateQuestion()
// ═══════════════════════════════════════════════════════════════

class AdaptiveEngine {
  constructor(startLevel = 1) {
    this.level       = clamp(startLevel, 1, 5);
    this.performance = 0;   // running performance score
    this.history     = [];  // [{correct, timeMs, level}]
  }

  /**
   * Record the result of one question and update level.
   * @param {boolean} correct
   * @param {number}  timeMs   - milliseconds taken
   * @param {number}  targetMs - "fast" threshold (default 8000)
   */
  update(correct, timeMs, targetMs = ADAPTIVE.fastMs) {
    const fast = timeMs < targetMs;

    if (correct && fast) this.performance += 2;
    else if (correct)    this.performance += 1;
    else                 this.performance -= 2;

    this.history.push({ correct, timeMs, level: this.level });

    if (this.performance >= ADAPTIVE.levelUp) {
      this.performance = 0;
      this.level = Math.min(5, this.level + 1);
    } else if (this.performance <= ADAPTIVE.levelDown) {
      this.performance = 0;
      this.level = Math.max(1, this.level - 1);
    }
  }

  get difficultyPct() { return (this.level - 1) / 4; }
}

// ─────────────────────────────────────────────────────────────────
//  generateQuestion
//
//  Returns a validated question object, or falls back to level 1.
//
//  Validation:
//    - No duplicate expressions
//    - All values > 0
//    - Spread (max − min of the 3 values) within the difficulty band
//    - No two values exactly equal (for L1-3; tiny tolerance for L4-5)
// ─────────────────────────────────────────────────────────────────

/**
 * @param {number}      diff       1..5
 * @param {string|null} forceCat   restrict to one category
 * @param {Set<string>} usedExprs  already-seen expressions this session
 * @param {Object}      catWeights {cat: weight} from storage
 * @returns {QuestionObject}
 */
function generateQuestion(diff, forceCat, usedExprs, catWeights) {
  const { min: minSpread, max: maxSpread } = SPREAD[diff] || SPREAD[1];
  const MAX_ATTEMPTS = 60;

  // For high difficulty (Level 4 & 5), use candidate pool selection to find tight-spread triplets reliably
  if (diff >= 4 && !forceCat) {
    const poolSize = 16;
    const candidates = [];
    for (let i = 0; i < poolSize * 2 && candidates.length < poolSize; i++) {
      const e = generateExpression(diff, null, usedExprs, catWeights);
      if (e && e.val > 0 && !candidates.some(c => c.expr === e.expr || Math.abs(c.val - e.val) < 0.0001)) {
        candidates.push(e);
      }
    }

    if (candidates.length >= 3) {
      candidates.sort((a, b) => a.val - b.val);

      // Search for adjacent triplets meeting the exact spread window
      for (let i = 0; i <= candidates.length - 3; i++) {
        const c0 = candidates[i], c1 = candidates[i + 1], c2 = candidates[i + 2];
        const sp = c2.val - c0.val;
        if (sp >= minSpread && sp <= maxSpread) {
          const bubbles = [
            { id: 'A', expression: c0.expr, value: c0.val, cat: c0.cat, shortcut: c0.shortcut },
            { id: 'B', expression: c1.expr, value: c1.val, cat: c1.cat, shortcut: c1.shortcut },
            { id: 'C', expression: c2.expr, value: c2.val, cat: c2.cat, shortcut: c2.shortcut },
          ];
          if (usedExprs) {
            usedExprs.add(c0.expr); usedExprs.add(c1.expr); usedExprs.add(c2.expr);
          }
          return {
            id:           Date.now() + Math.random(),
            difficulty:   diff,
            bubbles:      shuffle(bubbles),
            correctOrder: [...bubbles].sort((a, b) => a.value - b.value).map(b => b.id),
            createdAt:    Date.now(),
          };
        }
      }

      // If no triplet met the strict maxSpread, pick the tightest available triplet
      let bestTriplet = null;
      let bestSpread = Infinity;
      for (let i = 0; i <= candidates.length - 3; i++) {
        const sp = candidates[i + 2].val - candidates[i].val;
        if (sp >= minSpread && sp < bestSpread) {
          bestSpread = sp;
          bestTriplet = [candidates[i], candidates[i + 1], candidates[i + 2]];
        }
      }

      if (bestTriplet && bestSpread <= maxSpread * 2.5) {
        const bubbles = bestTriplet.map((c, idx) => ({
          id:         String.fromCharCode(65 + idx),
          expression: c.expr,
          value:      c.val,
          cat:        c.cat,
          shortcut:   c.shortcut,
        }));
        if (usedExprs) {
          bestTriplet.forEach(c => usedExprs.add(c.expr));
        }
        return {
          id:           Date.now() + Math.random(),
          difficulty:   diff,
          bubbles:      shuffle(bubbles),
          correctOrder: [...bubbles].sort((a, b) => a.value - b.value).map(b => b.id),
          createdAt:    Date.now(),
        };
      }
    }
  }

  // Standard path for diff 1-3 or when category is forced
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const e1 = generateExpression(diff, forceCat, usedExprs, catWeights);
    const e2 = generateExpression(diff, forceCat, usedExprs, catWeights);
    const e3 = generateExpression(diff, forceCat, usedExprs, catWeights);

    // No duplicate expressions
    if (e1.expr === e2.expr || e1.expr === e3.expr || e2.expr === e3.expr) continue;

    const vals = [e1.val, e2.val, e3.val];
    if (vals.some(v => v <= 0)) continue;

    const sorted = [...vals].sort((a, b) => a - b);
    const spread = sorted[2] - sorted[0];

    if (spread < minSpread || spread > maxSpread) continue;

    const tol = diff >= 4 ? 0.001 : 0;
    const [v0, v1, v2] = sorted;
    if (Math.abs(v0 - v1) <= tol && v0 !== v1) continue;
    if (Math.abs(v1 - v2) <= tol && v1 !== v2) continue;

    const bubbles = [
      { id: 'A', expression: e1.expr, value: e1.val, cat: e1.cat, shortcut: e1.shortcut },
      { id: 'B', expression: e2.expr, value: e2.val, cat: e2.cat, shortcut: e2.shortcut },
      { id: 'C', expression: e3.expr, value: e3.val, cat: e3.cat, shortcut: e3.shortcut },
    ];

    const correctOrder = [...bubbles].sort((a, b) => a.value - b.value).map(b => b.id);
    const displayBubbles = shuffle(bubbles);

    if (usedExprs) {
      usedExprs.add(e1.expr);
      usedExprs.add(e2.expr);
      usedExprs.add(e3.expr);
    }

    return {
      id:           Date.now() + Math.random(),
      difficulty:   diff,
      bubbles:      displayBubbles,
      correctOrder,
      createdAt:    Date.now(),
    };
  }

  // Fallback to diff - 1: NEVER jump straight from 5 to 1!
  if (diff > 1) return generateQuestion(diff - 1, forceCat, usedExprs, catWeights);

  // Ultimate Level 1 fallback
  const a = ri(10, 50), b = ri(20, 60), c = ri(30, 80);
  return {
    id:           Date.now(),
    difficulty:   1,
    bubbles:      [
      { id: 'A', expression: `${a} + 5`, value: a + 5, cat: 'addition', shortcut: null },
      { id: 'B', expression: `${b} + 5`, value: b + 5, cat: 'addition', shortcut: null },
      { id: 'C', expression: `${c} + 5`, value: c + 5, cat: 'addition', shortcut: null },
    ],
    correctOrder: ['A', 'B', 'C'],
    createdAt:    Date.now(),
  };
}
