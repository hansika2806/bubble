// ═══════════════════════════════════════════════════════════════
//  storage.js — localStorage persistence
//
//  Saves:
//    - Session summaries (last 60 sessions, for daily strip)
//    - Per-category accuracy history (for spaced repetition weights)
// ═══════════════════════════════════════════════════════════════

const Storage = (() => {
  const SESSIONS_KEY  = 'bubbleGame_sessions_v2';
  const WEIGHTS_KEY   = 'bubbleGame_catWeights_v2';
  const MAX_SESSIONS  = 60;

  // ── Session log ─────────────────────────────────────────────

  function getSessions() {
    try {
      return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
    } catch { return []; }
  }

  /**
   * Save a completed session.
   * @param {{
   *   mode: string,
   *   totalQ: number,
   *   correct: number,
   *   accuracy: number,
   *   avgTimeSec: number,
   *   score: number,
   *   highestLevel: number,
   *   catStats: Object
   * }} data
   */
  function saveSession(data) {
    try {
      const sessions = getSessions();
      sessions.push({
        ...data,
        date:      todayISO(),
        ts:        Date.now(),
      });
      // Keep only the most recent MAX_SESSIONS
      const trimmed = sessions.slice(-MAX_SESSIONS);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
    } catch { /* storage full or unavailable */ }
  }

  // ── Category weights (spaced repetition) ────────────────────

  /**
   * Get current category weights.
   * Weight = inverse of recent accuracy. Weak categories weighted higher.
   * @returns {Object} { [cat]: number }
   */
  function getCatWeights() {
    try {
      return JSON.parse(localStorage.getItem(WEIGHTS_KEY) || '{}');
    } catch { return {}; }
  }

  /**
   * Update category weights after a session.
   * Blends new session data with existing weights (EMA).
   * @param {Object} catStats { [cat]: { correct, total } }
   */
  function updateCatWeights(catStats) {
    try {
      const current = getCatWeights();
      Object.entries(catStats).forEach(([cat, s]) => {
        if (s.total === 0) return;
        const accuracy = s.correct / s.total;             // 0..1
        const newWeight = 1 + (1 - accuracy) * 1.5;      // 1.0 (100%) .. 2.5 (0%)
        const old = current[cat] || 1;
        current[cat] = round2(old * 0.4 + newWeight * 0.6); // EMA blend
      });
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(current));
    } catch { }
  }

  // ── Daily stats helper ───────────────────────────────────────

  /**
   * Returns the last N calendar days as strings ['YYYY-MM-DD', ...]
   * with a flag indicating whether a session was played that day.
   * @param {number} n
   */
  function getLastNDays(n) {
    const sessions = getSessions();
    const datesPlayed = new Set(sessions.map(s => s.date));
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = isoDate(d);
      days.push({ date: iso, played: datesPlayed.has(iso), isToday: i === 0 });
    }
    return days;
  }

  /** Count consecutive days with at least one session ending today */
  function getCurrentStreak() {
    const sessions = getSessions();
    if (sessions.length === 0) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    const today = todayISO();
    if (dates[0] !== today) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      prev.setDate(prev.getDate() - 1);
      if (isoDate(prev) === isoDate(curr)) streak++;
      else break;
    }
    return streak;
  }

  // ── Utilities ────────────────────────────────────────────────

  function todayISO() { return isoDate(new Date()); }

  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ── Public API ───────────────────────────────────────────────
  return { getSessions, saveSession, getCatWeights, updateCatWeights, getLastNDays, getCurrentStreak };
})();
