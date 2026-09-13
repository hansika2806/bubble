// ═══════════════════════════════════════════════════════════════
//  templates.js — Expression template library + generateExpression()
//
//  Each template: { cat, diff, shortcut (opt), gen() → {expr,val}|null }
//  Static .cat allows forceCat filtering WITHOUT calling gen().
// ═══════════════════════════════════════════════════════════════

const T = {

  // ─────────────────── LEVEL 1 — BASIC ARITHMETIC ─────────────

  add_simple: {
    cat: 'addition', diff: 1,
    shortcut: 'Add tens first, then units. E.g. 34+27 = 30+20 + 4+7',
    gen() {
      const a = ri(12, 70), b = ri(6, 40);
      return { expr: `${a} + ${b}`, val: a + b };
    }
  },

  add_three: {
    cat: 'addition', diff: 1,
    shortcut: 'Group numbers that sum to round tens first',
    gen() {
      const a = ri(5, 25), b = ri(5, 20), c = ri(5, 20);
      return { expr: `${a} + ${b} + ${c}`, val: a + b + c };
    }
  },

  sub_simple: {
    cat: 'subtraction', diff: 1,
    shortcut: 'Count up from smaller number to larger to find difference',
    gen() {
      const a = ri(25, 95), b = ri(5, a - 5);
      return { expr: `${a} − ${b}`, val: a - b };
    }
  },

  mul_simple: {
    cat: 'multiplication', diff: 1,
    shortcut: 'Times tables. If >12×12 break it: 14×6 = 10×6 + 4×6',
    gen() {
      const a = ri(3, 13), b = ri(3, 11);
      return { expr: `${a} × ${b}`, val: a * b };
    }
  },

  div_simple: {
    cat: 'division', diff: 1,
    shortcut: 'Ask: what × divisor = dividend? Use times tables.',
    gen() {
      const b = ri(2, 10), a = b * ri(3, 12);
      return { expr: `${a} ÷ ${b}`, val: a / b };
    }
  },

  square_small: {
    cat: 'powers', diff: 1,
    shortcut: 'Memorise squares: 11²=121, 12²=144, 13²=169, 14²=196, 15²=225',
    gen() {
      const a = ri(2, 13);
      return { expr: `${a}²`, val: a ** 2 };
    }
  },

  cube_small: {
    cat: 'powers', diff: 1,
    shortcut: 'Cubes: 2³=8, 3³=27, 4³=64, 5³=125, 6³=216, 7³=343',
    gen() {
      const a = ri(2, 7);
      return { expr: `${a}³`, val: a ** 3 };
    }
  },

  sqrt_small: {
    cat: 'roots', diff: 1,
    shortcut: 'Perfect squares: 1,4,9,16,25,36,49,64,81,100,121,144,169,196,225',
    gen() {
      const sq = pick([4, 9, 16, 25, 36, 49, 64, 81, 100]);
      return { expr: `√${sq}`, val: Math.sqrt(sq) };
    }
  },

  cbrt_simple: {
    cat: 'roots', diff: 1,
    shortcut: '∛8=2, ∛27=3, ∛64=4, ∛125=5, ∛216=6, ∛343=7',
    gen() {
      const cb = pick([8, 27, 64, 125, 216]);
      return { expr: `∛${cb}`, val: Math.cbrt(cb) };
    }
  },

  sq_minus: {
    cat: 'powers', diff: 1,
    shortcut: 'Square first (BODMAS), then subtract',
    gen() {
      const a = ri(3, 10), b = ri(1, 12);
      return { expr: `${a}² − ${b}`, val: a ** 2 - b };
    }
  },

  // ─────────────────── LEVEL 2 — PERCENTAGES & DECIMALS ───────

  pct_easy: {
    cat: 'percentage', diff: 2,
    shortcut: '10%=÷10  20%=÷5  25%=÷4  50%=÷2  75%=÷4×3',
    gen() {
      const p = pick([10, 20, 25, 50, 75]);
      const x = pick([100, 200, 400, 80, 160, 300, 500, 120, 240]);
      return { expr: `${p}% of ${x}`, val: p * x / 100 };
    }
  },

  pct_tens: {
    cat: 'percentage', diff: 2,
    shortcut: 'Find 10% first (÷10), then scale: 30%=10%×3, 40%=10%×4',
    gen() {
      const p = pick([10, 20, 30, 40, 60, 70, 80, 90]);
      const x = pick([50, 150, 250, 350, 120, 180, 220]);
      return { expr: `${p}% of ${x}`, val: round2(p * x / 100) };
    }
  },

  dec_mul: {
    cat: 'decimals', diff: 2,
    shortcut: 'Ignore decimal, multiply whole numbers, then place decimal point',
    gen() {
      const a = pick([0.5, 1.5, 2.5, 3.5, 4.5, 6.5]);
      const b = ri(2, 12);
      return { expr: `${a} × ${b}`, val: round2(a * b) };
    }
  },

  dec_div_easy: {
    cat: 'decimal_division', diff: 2,
    shortcut: 'Multiply both by 10 to clear decimal: 7.5÷1.5 → 75÷15 = 5',
    gen() {
      const d = pick([0.5, 1.5, 2.5]);
      const n = round2(d * ri(2, 14));
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  sqrt_med: {
    cat: 'roots', diff: 2,
    shortcut: '11²=121, 12²=144, 13²=169, 14²=196, 15²=225, 16²=256, 17²=289',
    gen() {
      const sq = pick([121, 144, 169, 196, 225, 256, 289, 324, 361, 400]);
      return { expr: `√${sq}`, val: Math.sqrt(sq) };
    }
  },

  sqrt_large: {
    cat: 'roots', diff: 2,
    shortcut: '20²=400, 21²=441, 22²=484, 23²=529, 24²=576, 25²=625',
    gen() {
      const sq = pick([441, 484, 529, 576, 625, 676, 729, 784, 841, 900]);
      return { expr: `√${sq}`, val: Math.sqrt(sq) };
    }
  },

  add_decimal: {
    cat: 'decimals', diff: 2,
    shortcut: 'Separate integer and decimal parts, add individually',
    gen() {
      const a = ri(10, 60), b = pick([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);
      return { expr: `${a} + ${b}`, val: round2(a + b) };
    }
  },

  sub_decimal: {
    cat: 'decimals', diff: 2,
    shortcut: 'Round then adjust: 28.5 − 0.5 = 28',
    gen() {
      const a = ri(15, 60), b = pick([0.5, 1.5, 2.5, 3.5, 4.5]);
      if (a - b <= 0) return null;
      return { expr: `${a} − ${b}`, val: round2(a - b) };
    }
  },

  // ─────────────────── LEVEL 3 — BODMAS & COMBINED ────────────

  bodmas_add: {
    cat: 'BODMAS', diff: 3,
    shortcut: 'BODMAS: × before +. Solve 8×3 first, THEN add 5',
    gen() {
      const a = ri(3, 18), b = ri(2, 8), c = ri(2, 7);
      return { expr: `${a} + ${b} × ${c}`, val: a + b * c };
    }
  },

  bodmas_sub: {
    cat: 'BODMAS', diff: 3,
    shortcut: 'BODMAS: × before −. Solve multiplication first.',
    gen() {
      const b = ri(2, 7), c = ri(2, 6), a = ri(b * c + 5, b * c + 30);
      return { expr: `${a} − ${b} × ${c}`, val: a - b * c };
    }
  },

  bracket_sq_div: {
    cat: 'BODMAS', diff: 3,
    shortcut: 'Step by step: (bracket) → square → divide',
    gen() {
      const a = ri(5, 16), b = ri(2, a - 2), c = ri(2, 8);
      const v = round2(((a - b) ** 2) / c);
      if (!isFinite(v) || v < 1) return null;
      return { expr: `(${a}−${b})² ÷ ${c}`, val: v };
    }
  },

  bracket_mul: {
    cat: 'BODMAS', diff: 3,
    shortcut: 'Bracket first, then multiply',
    gen() {
      const a = ri(6, 18), b = ri(2, a - 2), c = ri(3, 10);
      return { expr: `(${a}−${b}) × ${c}`, val: (a - b) * c };
    }
  },

  bracket_add_mul: {
    cat: 'BODMAS', diff: 3,
    shortcut: 'Bracket first, then multiply',
    gen() {
      const a = ri(3, 10), b = ri(3, 10), c = ri(2, 8);
      return { expr: `(${a}+${b}) × ${c}`, val: (a + b) * c };
    }
  },

  pct_add: {
    cat: 'percentage', diff: 3,
    shortcut: 'Calculate percentage first, then add the integer',
    gen() {
      const p = pick([10, 20, 25, 50]);
      const x = pick([100, 200, 400, 300, 500]);
      const b = ri(5, 40);
      return { expr: `${p}% of ${x} + ${b}`, val: round2(p * x / 100 + b) };
    }
  },

  pct_sub: {
    cat: 'percentage', diff: 3,
    shortcut: 'Find percentage, then subtract. Check result is positive.',
    gen() {
      const p = pick([10, 20, 25, 50]);
      const x = pick([100, 200, 400, 300]);
      const b = ri(5, 25);
      const v = round2(p * x / 100 - b);
      if (v <= 0) return null;
      return { expr: `${p}% of ${x} − ${b}`, val: v };
    }
  },

  dec_div_med: {
    cat: 'decimal_division', diff: 3,
    shortcut: 'Multiply both by 10: 72÷2.4 → 720÷24. Then divide normally.',
    gen() {
      const d = pick([2.4, 1.2, 0.4, 4.8, 3.6, 1.6]);
      const mult = ri(3, 15);
      const n = round2(d * mult);
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  mul_add: {
    cat: 'mixed', diff: 3,
    shortcut: 'Multiply first (BODMAS), then add',
    gen() {
      const a = ri(3, 10), b = ri(3, 10), c = ri(5, 30);
      return { expr: `${a} × ${b} + ${c}`, val: a * b + c };
    }
  },

  sq_add: {
    cat: 'powers', diff: 3,
    shortcut: 'Square first, then add: 7² + 15 = 49 + 15 = 64',
    gen() {
      const a = ri(4, 12), b = ri(5, 35);
      return { expr: `${a}² + ${b}`, val: a ** 2 + b };
    }
  },

  sq_sub: {
    cat: 'powers', diff: 3,
    shortcut: 'Square first, then subtract',
    gen() {
      const a = ri(5, 12), b = ri(3, 20);
      const v = a ** 2 - b;
      if (v <= 0) return null;
      return { expr: `${a}² − ${b}`, val: v };
    }
  },

  div_add: {
    cat: 'mixed', diff: 3,
    shortcut: 'Divide first (BODMAS), then add',
    gen() {
      const b = ri(3, 9), a = b * ri(3, 9), c = ri(5, 25);
      return { expr: `${a} ÷ ${b} + ${c}`, val: a / b + c };
    }
  },

  sqrt_add: {
    cat: 'roots', diff: 3,
    shortcut: 'Find the root first, then add. Know your perfect squares.',
    gen() {
      const sq = pick([25, 36, 49, 64, 81, 100, 121, 144]);
      const b = ri(5, 30);
      return { expr: `√${sq} + ${b}`, val: Math.sqrt(sq) + b };
    }
  },

  // ─────────────────── LEVEL 4 — CLOSE VALUES ─────────────────

  frac_approx: {
    cat: 'division', diff: 4,
    shortcut: 'Long division mentally. 137÷9: 9×15=135, remainder 2 → ≈15.2',
    gen() {
      const d = ri(7, 16);
      const q = ri(8, 22);
      const n = d * q + ri(1, d - 1);
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  pct_odd: {
    cat: 'percentage', diff: 4,
    shortcut: 'Break odd %: 13% = 10% + 3%, or 13% = (10% + 10% + 10%)/something',
    gen() {
      const p = pick([11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27]);
      const x = pick([200, 300, 400, 500, 600, 250]);
      return { expr: `${p}% of ${x}`, val: round2(p * x / 100) };
    }
  },

  sqrt_approx: {
    cat: 'roots', diff: 4,
    shortcut: 'Bracket between perfect squares: √130 — 11²=121, 12²=144 → ≈11.4',
    gen() {
      const a = pick([105, 110, 115, 120, 122, 126, 130, 135, 138,
                      142, 145, 148, 150, 155, 158, 160, 163, 165,
                      168, 170, 172, 175, 178, 180, 185]);
      return { expr: `√${a}`, val: round2(Math.sqrt(a)) };
    }
  },

  cube_div10: {
    cat: 'powers', diff: 4,
    shortcut: 'Cube the base, then divide by 10 or 100. 12³=1728 → ÷100=17.28',
    gen() {
      const a = pick([10, 11, 12, 13, 14]);
      const d = pick([10, 100]);
      return { expr: `${a}³ ÷ ${d}`, val: round2(a ** 3 / d) };
    }
  },

  dec_div_close: {
    cat: 'decimal_division', diff: 4,
    shortcut: 'Multiply both by 10 to clear decimal, then do integer division',
    gen() {
      const d = pick([1.2, 2.4, 3.6, 4.8, 1.6, 2.8, 3.2]);
      const q = ri(5, 18);
      const n = round2(d * q + round2(Math.random() * (d - 0.05)));
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  pct_close: {
    cat: 'percentage', diff: 4,
    shortcut: 'Decompose: 23% of 400 = 20%×400 + 3%×400 = 80 + 12 = 92',
    gen() {
      const p = pick([11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24]);
      const x = pick([200, 250, 300, 350, 400, 450, 500]);
      return { expr: `${p}% of ${x}`, val: round2(p * x / 100) };
    }
  },

  frac_close: {
    cat: 'close_values', diff: 4,
    shortcut: 'Estimate carefully — values differ by less than 3. Use long division.',
    gen() {
      const d = ri(6, 13);
      const q = ri(10, 25);
      const r = ri(1, d - 1);
      const n = d * q + r;
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  pct_dec: {
    cat: 'percentage', diff: 4,
    shortcut: 'Find 10% first, then halve for 5%, etc.',
    gen() {
      const p = pick([15, 35, 45, 65, 85]);
      const x = pick([120, 180, 220, 260, 280, 320, 360, 380]);
      return { expr: `${p}% of ${x}`, val: round2(p * x / 100) };
    }
  },

  // ─────────────────── LEVEL 5 — COMPLEX + CLOSE ──────────────

  cplx_bracket_sq: {
    cat: 'BODMAS', diff: 5,
    shortcut: 'Step by step — bracket → square → divide. Write interim result.',
    gen() {
      const a = ri(6, 18), b = ri(2, a - 2), c = ri(3, 10);
      const v = round2((a - b) ** 2 / c);
      if (!isFinite(v) || v < 2) return null;
      return { expr: `(${a}−${b})² ÷ ${c}`, val: v };
    }
  },

  cplx_pct_sub: {
    cat: 'percentage', diff: 5,
    shortcut: 'Find % precisely, then subtract. Estimate to 1 decimal.',
    gen() {
      const p = pick([12, 15, 17, 22, 35, 45]);
      const x = pick([200, 300, 400, 500, 600]);
      const a = ri(8, 45);
      const v = round2(p * x / 100 - a);
      if (v <= 0) return null;
      return { expr: `${p}% of ${x} − ${a}`, val: v };
    }
  },

  cplx_dec_mul_add: {
    cat: 'decimals', diff: 5,
    shortcut: 'Multiply first (ignore decimal, place after), then add',
    gen() {
      const a = pick([1.5, 2.5, 3.5, 4.5, 1.2, 2.4, 3.6]);
      const b = ri(4, 14), c = ri(5, 30);
      return { expr: `${a} × ${b} + ${c}`, val: round2(a * b + c) };
    }
  },

  cplx_bracket_dec: {
    cat: 'BODMAS', diff: 5,
    shortcut: 'Bracket first, then ×1.5 = ×1 + ×0.5 (half and add)',
    gen() {
      const a = ri(5, 14), b = ri(2, a - 1), c = pick([1.5, 2.5, 3.5]);
      const v = round2((a + b) * c);
      return { expr: `(${a}+${b}) × ${c}`, val: v };
    }
  },

  cplx_dec_div: {
    cat: 'decimal_division', diff: 5,
    shortcut: 'Multiply both by 10 or 100 to clear decimals, then divide',
    gen() {
      const d = pick([2.4, 3.6, 4.8, 1.2, 2.8, 1.6, 4.5]);
      const n = ri(120, 420);
      return { expr: `${n} ÷ ${d}`, val: round2(n / d) };
    }
  },

  cplx_sqrt_add: {
    cat: 'roots', diff: 5,
    shortcut: 'Know exact root, then add precisely — no estimation needed here',
    gen() {
      const sq = pick([144, 169, 196, 225, 256, 289, 324, 361]);
      const b = ri(8, 35);
      return { expr: `√${sq} + ${b}`, val: Math.sqrt(sq) + b };
    }
  },

  cplx_mul_sub: {
    cat: 'mixed', diff: 5,
    shortcut: 'Multiply first (×1.5 = add half), then subtract',
    gen() {
      const a = pick([1.5, 2.5, 3.5, 4.5]);
      const b = ri(6, 16), c = ri(4, 20);
      const v = round2(a * b - c);
      if (v <= 0) return null;
      return { expr: `${a} × ${b} − ${c}`, val: v };
    }
  },

  cplx_pct_add: {
    cat: 'percentage', diff: 5,
    shortcut: '15%: find 10% (÷10) then halve for 5%, add. Then add integer.',
    gen() {
      const p = pick([12, 15, 17, 22, 35, 45]);
      const x = pick([200, 300, 400, 500, 600]);
      const b = ri(8, 40);
      return { expr: `${p}% of ${x} + ${b}`, val: round2(p * x / 100 + b) };
    }
  },

  cplx_sq_pct: {
    cat: 'BODMAS', diff: 5,
    shortcut: 'Square the base first, then take the percentage',
    gen() {
      const a = ri(4, 9);
      const p = pick([10, 20, 25, 50]);
      const sq = a ** 2;
      return { expr: `${p}% of ${a}²`, val: round2(p * sq / 100) };
    }
  },
};

// ── TEMPLATE KEYS GROUPED BY DIFFICULTY ──────────────────────────

const DIFF_KEYS = {
  1: ['add_simple', 'add_three', 'sub_simple', 'mul_simple', 'div_simple',
      'square_small', 'cube_small', 'sqrt_small', 'cbrt_simple', 'sq_minus'],

  2: ['pct_easy', 'pct_tens', 'dec_mul', 'dec_div_easy', 'sqrt_med',
      'sqrt_large', 'add_decimal', 'sub_decimal',
      // Include easy templates so spread is achievable
      'add_simple', 'mul_simple', 'div_simple'],

  3: ['bodmas_add', 'bodmas_sub', 'bracket_sq_div', 'bracket_mul', 'bracket_add_mul',
      'pct_add', 'pct_sub', 'dec_div_med', 'mul_add', 'sq_add', 'sq_sub',
      'div_add', 'sqrt_add'],

  4: ['frac_approx', 'pct_odd', 'sqrt_approx', 'cube_div10',
      'dec_div_close', 'pct_close', 'frac_close', 'pct_dec'],

  5: ['cplx_bracket_sq', 'cplx_pct_sub', 'cplx_dec_mul_add', 'cplx_bracket_dec',
      'cplx_dec_div', 'cplx_sqrt_add', 'cplx_mul_sub', 'cplx_pct_add', 'cplx_sq_pct',
      // Include some level-4 templates so spread validation is achievable
      'frac_approx', 'sqrt_approx'],
};

// ── generateExpression ───────────────────────────────────────────

/**
 * Generate a single expression for the given difficulty.
 * @param {number} diff        - 1..5
 * @param {string|null} forceCat - restrict to this category
 * @param {Set<string>} usedExprs - expressions already used this session
 * @param {Object} catWeights  - { [cat]: weight } from storage (higher = more likely)
 */
function generateExpression(diff, forceCat, usedExprs, catWeights) {
  let keys;

  if (forceCat) {
    // Filter by STATIC .cat — never calls gen()
    keys = Object.keys(T).filter(k => T[k].cat === forceCat);
    if (keys.length === 0) {
      // Fallback if category has no templates at this difficulty
      keys = DIFF_KEYS[diff] || DIFF_KEYS[1];
    }
  } else {
    keys = DIFF_KEYS[diff] || DIFF_KEYS[1];
  }

  // Apply category weights: replicate keys proportionally
  if (catWeights && Object.keys(catWeights).length > 0 && !forceCat) {
    const weighted = [];
    keys.forEach(k => {
      const cat = T[k].cat;
      const w = catWeights[cat] || 1;
      const copies = Math.max(1, Math.round(w * 2));
      for (let i = 0; i < copies; i++) weighted.push(k);
    });
    keys = weighted;
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const key = pick(keys);
    const tmpl = T[key];
    if (!tmpl) continue;
    const res = tmpl.gen();
    if (!res) continue;
    if (!isFinite(res.val) || isNaN(res.val)) continue;
    if (res.val <= 0) continue;
    if (usedExprs && usedExprs.has(res.expr)) continue;
    return {
      expr:     res.expr,
      val:      res.val,
      cat:      tmpl.cat,
      diff:     tmpl.diff,
      shortcut: tmpl.shortcut || null,
    };
  }

  // Absolute fallback (simple addition)
  const a = ri(5, 50), b = ri(1, a - 1);
  return { expr: `${a} + ${b}`, val: a + b, cat: 'addition', diff: 1, shortcut: null };
}
