// ═══════════════════════════════════════════════════════════════
//  config.js — Constants, helpers, shared lookup tables
// ═══════════════════════════════════════════════════════════════

const CAT_LABELS = {
  addition:         'Addition',
  subtraction:      'Subtraction',
  multiplication:   'Multiplication',
  division:         'Division',
  percentage:       'Percentages',
  decimals:         'Decimals',
  decimal_division: 'Decimal Division',
  roots:            'Roots & Surds',
  powers:           'Powers & Cubes',
  BODMAS:           'BODMAS',
  close_values:     'Close Values',
  mixed:            'Mixed Operations',
};

const LEVEL_NAMES = ['', 'Easy', 'Easy+', 'Medium', 'Medium+', 'Advanced'];

// How spread-apart the 3 bubble values must be (max - min of the 3 values)
const SPREAD = {
  1: { min: 12,  max: 9999 },
  2: { min: 6,   max: 9999 },
  3: { min: 3,   max: 9999 },
  4: { min: 0.5, max: 5    },
  5: { min: 0.1, max: 3    },
};

const ADAPTIVE = {
  levelUp:   2,    // only 2 performance points needed to increase level
  levelDown: -2,   // decrease level if struggling
  fastMs:    12000, // generous "fast" threshold (12 seconds)
};

const SCORING = {
  base:           100,
  maxSpeedBonus:  50,
  speedTargetSec: 15,
  wrongPenalty:   50,
  streakTiers: [[10, 1.5], [5, 1.2], [3, 1.1]], // [minStreak, multiplier]
};

// ── PURE HELPERS ─────────────────────────────────────────────────

/** Random integer in [min, max] inclusive */
function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random element from array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Round to 2 decimal places */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Fisher-Yates shuffle (returns new array) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Format seconds as MM:SS */
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Difficulty level number → human label */
function diffName(d) {
  return LEVEL_NAMES[d] || '?';
}

/** Clamp value between lo and hi */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
