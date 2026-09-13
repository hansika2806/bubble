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
  const MAX_ATTEMPTS = 80;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const e1 = generateExpression(diff, forceCat, usedExprs, catWeights);
    const e2 = generateExpression(diff, forceCat, usedExprs, catWeights);
    const e3 = generateExpression(diff, forceCat, usedExprs, catWeights);

    // No duplicate expressions
    if (e1.expr === e2.expr || e1.expr === e3.expr || e2.expr === e3.expr) continue;

    const vals  = [e1.val, e2.val, e3.val];

    // All values must be positive
    if (vals.some(v => v <= 0)) continue;

    const sorted = [...vals].sort((a, b) => a - b);
    const spread = sorted[2] - sorted[0];

    // Spread must be within the difficulty band
    if (spread < minSpread || spread > maxSpread) continue;

    // No two values should be equal (allow tiny tolerance at L4/5 for floating point)
    const tol = diff >= 4 ? 0.001 : 0;
    const [v0, v1, v2] = sorted;
    if (Math.abs(v0 - v1) <= tol && v0 !== v1) continue;
    if (Math.abs(v1 - v2) <= tol && v1 !== v2) continue;
    // Fully identical values are OK — handled as tie by click handler

    // Build bubble objects
    const bubbles = [
      { id: 'A', expression: e1.expr, value: e1.val, cat: e1.cat, shortcut: e1.shortcut },
      { id: 'B', expression: e2.expr, value: e2.val, cat: e2.cat, shortcut: e2.shortcut },
      { id: 'C', expression: e3.expr, value: e3.val, cat: e3.cat, shortcut: e3.shortcut },
    ];

    // Correct order: smallest → largest value (ties OK in either order)
    const correctOrder = [...bubbles]
      .sort((a, b) => a.value - b.value)
      .map(b => b.id);

    // Shuffle display positions — player must solve, not use position memory
    const displayBubbles = shuffle(bubbles);

    // Register expressions as used
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

  // If validation never passed, fall back to level 1 (should be very rare)
  if (diff > 1) return generateQuestion(1, null, usedExprs, null);

  // Ultimate fallback
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
