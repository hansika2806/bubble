// ═══════════════════════════════════════════════════════════════
//  ui.js — All DOM rendering and display logic
// ═══════════════════════════════════════════════════════════════

const UI = (() => {

  // ── Element refs ─────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const screens = {
    home:    $('home-screen'),
    game:    $('game-screen'),
    results: $('results-screen'),
  };

  // ── Screen management ─────────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ── Mode badge ────────────────────────────────────────────────
  const MODE_LABELS = {
    learning: 'LEARNING MODE',
    speed:    'SPEED MODE',
    weakness: 'WEAKNESS MODE',
    adaptive: 'ADAPTIVE MOCK',
    exam:     'EXAM SIMULATION',
  };
  function updateModeBadge(mode) {
    const badge = $('mode-badge');
    badge.textContent = MODE_LABELS[mode] || mode.toUpperCase();
    badge.className = 'mode-badge' + (mode === 'exam' ? ' exam-badge' : '');
  }

  // ── Header stats bar ──────────────────────────────────────────
  function updateHeader() {
    const s = State;
    const idx = s.questionIndex + 1;
    const totalLabel = s.totalQuestions === 0 ? '∞' : String(s.totalQuestions).padStart(2, '0');
    $('q-counter').textContent = `${String(idx).padStart(2, '0')} / ${totalLabel}`;
    $('score-display').textContent = s.score;
    $('streak-display').textContent = `${s.streak}🔥`;
    $('level-display').textContent = diffName(s.currentLevel);
    const total = s.correct + s.incorrect;
    $('acc-display').textContent = total > 0 ? `${Math.round(s.correct / total * 100)}%` : '—';
    const pct = (s.currentLevel - 1) / 4 * 100;
    $('diff-bar-fill').style.width = `${pct}%`;
    $('diff-label').textContent = `Level ${s.currentLevel} / 5`;
  }

  // ── Timer display ─────────────────────────────────────────────
  function updateTimerDisplay(elapsed, mode, examTimeSec) {
    const el = $('timer-display');
    if (mode === 'exam') {
      // Timer handled by updateExamCountdown; show round elapsed here in normal timer spot
      el.textContent = fmtTime(elapsed);
      el.className = 'timer-display';
    } else {
      el.textContent = fmtTime(elapsed);
      el.className = 'timer-display' +
        (elapsed > 20 ? ' danger' : elapsed > 12 ? ' warn' : '');
    }
  }

  function updateExamCountdown(remaining, total) {
    // Show countdown prominently in timer area
    const el = $('timer-display');
    el.textContent = `${remaining}s`;
    el.className = 'timer-display exam-countdown' +
      (remaining <= 5 ? ' pulse' : '');
    $('timer-label').textContent = 'LEFT';
  }

  // ── Stop button (endless mode) ────────────────────────────────
  function setStopBtnVisible(visible) {
    $('stop-btn').style.display = visible ? 'block' : 'none';
  }

  // ── BUBBLE ARENA ──────────────────────────────────────────────

  // 5 preset triangle layouts so positions vary each round
  const LAYOUTS = [
    [{top:15,left:40,sz:22},{top:58,left:18,sz:22},{top:58,left:62,sz:22}],
    [{top:15,left:18,sz:22},{top:15,left:62,sz:22},{top:60,left:40,sz:22}],
    [{top:10,left:62,sz:22},{top:52,left:10,sz:22},{top:57,left:66,sz:22}],
    [{top:12,left:20,sz:22},{top:12,left:62,sz:22},{top:60,left:41,sz:22}],
    [{top:48,left:10,sz:22},{top:10,left:40,sz:22},{top:48,left:70,sz:22}],
  ];

  // Track the display order of bubbles so keyboard keys 1/2/3 work
  let _displayBubbles = []; // ordered left-to-right by layout position

  function renderBubbles(question, mode) {
    const arena = $('bubble-arena');
    arena.innerHTML = '';
    _displayBubbles = [];

    const layout = pick(LAYOUTS);
    // Shuffle which bubble goes to which position
    const posOrder = shuffle([0, 1, 2]);

    question.bubbles.forEach((bubble, i) => {
      const pos = layout[posOrder[i]];
      const sz  = `min(${pos.sz}vw, 130px)`;

      const div = document.createElement('div');
      div.className = 'bubble default entering';
      div.dataset.id = bubble.id;
      // Store screen x-position for keyboard ordering
      div.dataset.leftPct = pos.left;
      div.style.cssText = `
        width:${sz}; height:${sz};
        top:${pos.top}%; left:${pos.left}%;
        transform:translate(-50%,-50%);
        animation-delay:${i * 0.1}s;
      `;

      // Expression text
      const exprEl = document.createElement('div');
      exprEl.className = 'bubble-expr';
      exprEl.textContent = bubble.expression;
      div.appendChild(exprEl);

      // Keyboard key label (1/2/3 by left-to-right screen position)
      const keyEl = document.createElement('div');
      keyEl.className = 'bubble-key';
      keyEl.dataset.keyLabel = ''; // filled after sort
      div.appendChild(keyEl);

      div.addEventListener('click', () => handleBubbleClick(bubble.id));
      arena.appendChild(div);
    });

    // Assign keyboard labels 1/2/3 left-to-right
    const sorted = [...arena.querySelectorAll('.bubble')]
      .sort((a, b) => parseFloat(a.dataset.leftPct) - parseFloat(b.dataset.leftPct));
    sorted.forEach((el, i) => {
      el.querySelector('.bubble-key').textContent = `[${i + 1}]`;
      _displayBubbles[i] = el.dataset.id;
    });

    // Learning mode: highlight the smallest bubble after entrance animation
    if (mode === 'learning') {
      setTimeout(() => highlightNextBubble(question, [], mode), 500);
    }
  }

  function getBubbleEl(id) {
    return document.querySelector(`.bubble[data-id="${id}"]`);
  }

  function markBubbleCorrect(id, orderNum) {
    const el = getBubbleEl(id);
    if (!el) return;
    el.classList.remove('default', 'next-hint');
    el.classList.add('selected-correct');
    el.style.cursor = 'default';
    const orderEl = document.createElement('div');
    orderEl.className = 'bubble-order';
    orderEl.textContent = `#${orderNum}`;
    el.appendChild(orderEl);
  }

  function revealBubbleValue(id, value) {
    const el = getBubbleEl(id);
    if (!el) return;
    const valEl = document.createElement('div');
    valEl.className = 'bubble-value-reveal';
    valEl.textContent = `= ${value}`;
    el.appendChild(valEl);
  }

  function markBubbleWrong(id) {
    const el = getBubbleEl(id);
    if (!el) return;
    el.classList.remove('default', 'next-hint');
    el.classList.add('selected-wrong');
    setTimeout(() => {
      el.classList.remove('selected-wrong');
      el.classList.add('default');
    }, 500);
  }

  function markExamTimeout(question, selectedOrder) {
    question.bubbles
      .filter(b => !selectedOrder.includes(b.id))
      .forEach(b => {
        const el = getBubbleEl(b.id);
        if (el) {
          el.classList.remove('default', 'next-hint');
          el.classList.add('exam-timeout');
        }
      });
  }

  function highlightNextBubble(question, selectedOrder, mode) {
    if (mode !== 'learning') return;
    document.querySelectorAll('.bubble').forEach(b => b.classList.remove('next-hint'));
    const remaining = question.bubbles
      .filter(b => !selectedOrder.includes(b.id))
      .sort((a, b) => a.value - b.value);
    if (remaining.length === 0) return;
    const minVal = remaining[0].value;
    remaining
      .filter(b => Math.abs(b.value - minVal) < 0.001)
      .forEach(b => {
        const el = getBubbleEl(b.id);
        if (el && !selectedOrder.includes(b.id)) el.classList.add('next-hint');
      });
  }

  // ── Selection dots ────────────────────────────────────────────
  function updateSelectionDots(n) {
    for (let i = 0; i < 3; i++) {
      const dot = $(`dot-${i}`);
      dot.classList.remove('filled', 'active');
      if (i < n)      dot.classList.add('filled');
      else if (i === n) dot.classList.add('active');
    }
  }

  // ── Feedback toast ────────────────────────────────────────────
  let _toastTimer = null;
  function showFeedbackToast(type, icon, title, detail, shortcut) {
    const toast   = $('feedback-toast');
    const sc      = $('toast-shortcut');
    $('toast-icon').textContent    = icon;
    $('toast-title').textContent   = title;
    $('toast-detail').textContent  = detail;
    sc.textContent                 = shortcut ? `💡 ${shortcut}` : '';
    sc.style.display               = shortcut ? 'block' : 'none';
    toast.className = `feedback-toast ${type} show`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(hideFeedbackToast, type === 'correct' ? 1000 : 2200);
  }
  function hideFeedbackToast() {
    $('feedback-toast').classList.remove('show');
  }

  // ── Round overlay ──────────────────────────────────────────────
  function showRoundOverlay(state, { perfect, pts, speedBonus, streakMult, elapsedSec }) {
    const overlay = $('round-overlay');
    $('round-icon').textContent  = perfect ? '🎉' : (state.autoFailed ? '⏱' : '❌');
    $('round-title').textContent = perfect ? 'Correct!' : (state.autoFailed ? 'Time Up!' : 'Wrong Order');
    $('round-pts').textContent   = perfect ? `+${pts} points` : (pts > 0 ? `+${pts} pts (partial)` : '0 points');

    // Answer reveal
    const reveal = $('round-answer-reveal');
    const sorted = [...state.question.bubbles].sort((a, b) => a.value - b.value);
    reveal.innerHTML = `
      <div class="reveal-title">Values (Smallest → Largest)</div>
      ${sorted.map((b, i) => `
        <div class="reveal-row">
          <span class="reveal-rank">${['1st','2nd','3rd'][i]}</span>
          <span class="reveal-expr">${b.expression}</span>
          <span class="reveal-val">= ${b.value}</span>
        </div>`).join('')}
    `;

    // Score breakdown
    const bd = $('round-breakdown');
    bd.innerHTML = `
      ${perfect ? `<div class="row"><span>Base</span><span>+${SCORING.base}</span></div>` : ''}
      ${speedBonus > 0 ? `<div class="row"><span>Speed bonus</span><span>+${speedBonus}</span></div>` : ''}
      ${state.roundMistakes > 0 ? `<div class="row"><span>Mistakes (×${state.roundMistakes})</span><span>−${state.roundMistakes * SCORING.wrongPenalty}</span></div>` : ''}
      ${streakMult > 1 ? `<div class="row"><span>Streak ×${state.streak}</span><span>×${streakMult}</span></div>` : ''}
      <div class="row"><span>Time</span><span>${elapsedSec}s</span></div>
    `;

    // Shortcut hint (show on wrong or in learning mode)
    const sc  = $('shortcut-hint');
    const shortcuts = state.question.bubbles
      .filter(b => b.shortcut)
      .map(b => `💡 ${b.shortcut}`);
    if (shortcuts.length > 0 && (state.mode === 'learning' || !perfect)) {
      sc.textContent = shortcuts[0];
      sc.classList.add('show');
    } else {
      sc.classList.remove('show');
    }

    const isLast = state.totalQuestions > 0 && state.questionIndex >= state.totalQuestions;
    $('next-btn').textContent = isLast ? 'VIEW RESULTS →' : 'NEXT QUESTION →';

    overlay.classList.add('show');
  }

  function hideRoundOverlay() {
    $('round-overlay').classList.remove('show');
  }

  // ── RESULTS SCREEN ─────────────────────────────────────────────
  function renderResults(state) {
    const log     = state.sessionLog;
    const total   = log.length;
    const correct = log.filter(q => q.perfect).length;
    const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
    const avgTime  = total > 0 ? round2(log.reduce((s, q) => s + q.elapsed, 0) / total) : 0;
    const fastest  = total > 0 ? Math.min(...log.map(q => q.elapsed)) : 0;
    const totalMistakes = log.reduce((s, q) => s + (q.mistakes || 0), 0);
    const highestLevel  = total > 0 ? Math.max(...log.map(q => q.level)) : 1;

    const inner = $('results-inner');
    inner.innerHTML = '';

    // ── Summary grid ────────────────────────────────────────────
    const cards = [
      { lbl: 'Total Questions', val: total,        cls: '' },
      { lbl: 'Correct',         val: correct,       cls: correct/total >= 0.8 ? 'good' : correct/total >= 0.6 ? 'warn' : 'bad' },
      { lbl: 'Accuracy',        val: `${accuracy}%`, cls: accuracy >= 80 ? 'good' : accuracy >= 60 ? 'warn' : 'bad' },
      { lbl: 'Avg. Time',       val: `${avgTime}s`,  cls: avgTime <= 6 ? 'good' : avgTime <= 12 ? 'warn' : 'bad' },
      { lbl: 'Fastest',         val: `${fastest}s`,  cls: 'good' },
      { lbl: 'Mistakes',        val: totalMistakes,  cls: totalMistakes === 0 ? 'good' : totalMistakes <= 5 ? 'warn' : 'bad' },
      { lbl: 'Final Score',     val: state.score,    cls: 'good' },
      { lbl: 'Highest Level',   val: diffName(highestLevel), cls: '' },
    ];

    const modeLabel = MODE_LABELS[state.mode] || state.mode.toUpperCase();
    const levelSubtitle = state.fixedLevel
      ? `Fixed Level ${state.fixedLevel} (${diffName(state.fixedLevel)})`
      : state.mode === 'exam' ? '1 → 5 Stage Progression' : 'Adaptive Difficulty';

    let html = `<div class="results-title">📊 ${modeLabel} RESULTS</div>
      <div style="text-align:center;color:var(--muted);font-size:.82rem;margin-top:-.5rem;margin-bottom:1.2rem;letter-spacing:.05em">${levelSubtitle}</div>`;
    html += `<div class="results-grid">`;
    html += cards.map(c => `
      <div class="result-card">
        <div class="rc-label">${c.lbl}</div>
        <div class="rc-val ${c.cls}">${c.val}</div>
      </div>`).join('');
    html += `</div>`;

    // ── Category accuracy ────────────────────────────────────────
    const catEntries = Object.entries(state.catStats).sort((a, b) => {
      const pa = a[1].total > 0 ? a[1].correct / a[1].total : 0;
      const pb = b[1].total > 0 ? b[1].correct / b[1].total : 0;
      return pa - pb; // worst first
    });

    html += `<div class="section-divider">Category Accuracy</div>`;
    if (catEntries.length === 0) {
      html += `<div style="color:var(--muted);font-size:.85rem">No data yet.</div>`;
    } else {
      html += catEntries.map(([cat, s]) => {
        const pct   = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
        const ok    = pct >= 80;
        const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';
        return `<div class="weak-row">
          <div class="weak-icon">${ok ? '✓' : '⚠'}</div>
          <div class="weak-name">${CAT_LABELS[cat] || cat}</div>
          <div class="weak-bar-track"><div class="weak-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="weak-pct" style="color:${color}">${pct}%</div>
        </div>`;
      }).join('');
    }

    // ── Performance insights ─────────────────────────────────────
    const HINTS = {
      decimal_division: 'Multiply both by 10 to clear decimals. E.g. 7.2÷2.4 → 72÷24.',
      percentage:       'Memorise: 10%=÷10, 25%=÷4, 50%=÷2, 20%=÷5, 75%=3÷4.',
      BODMAS:           'Always: Brackets → Powers → ÷× → ±. Work inside-out.',
      roots:            'Know perfect squares 1²–25² and cubes 1³–5³ by heart.',
      powers:           'Squares: 11²=121, 12²=144, 13²=169, 14²=196, 15²=225.',
      close_values:     'Estimate to 2 decimal places. Use long division mentally.',
      decimals:         'Ignore decimal point, do integer multiply, then place decimal.',
      mixed:            'Apply BODMAS strictly — multiply/divide before add/subtract.',
    };

    const slowCats = catEntries
      .map(([cat, s]) => ({
        cat,
        avg: s.total > 0 ? round2(s.totalMs / s.total / 1000) : 0,
        pct: s.total > 0 ? Math.round(s.correct / s.total * 100) : 0,
      }))
      .filter(c => c.avg > 8 || c.pct < 70)
      .slice(0, 4);

    html += `<div class="section-divider">Performance Insights</div>`;
    if (slowCats.length === 0) {
      html += `<div class="slow-insight">🎯 Great performance across all categories! Keep it up.</div>`;
    } else {
      html += slowCats.map(c => {
        const hint = HINTS[c.cat] || 'Practise this category in Weakness Mode.';
        return `<div class="slow-insight">
          <strong>${CAT_LABELS[c.cat] || c.cat}</strong> — avg ${c.avg}s · ${c.pct}% accuracy<br>
          <span style="color:var(--muted)">${hint}</span>
        </div>`;
      }).join('');
    }

    // ── Question log ─────────────────────────────────────────────
    html += `<div class="section-divider">Question Log</div>`;
    html += `<table class="log-table">
      <thead><tr>
        <th>#</th><th>Expressions &amp; Values</th><th>Result</th><th>Time</th><th>Level</th>
      </tr></thead>
      <tbody>`;
    html += log.map(q => {
      const badge = q.perfect
        ? `<span class="log-badge correct">✓ Perfect</span>`
        : q.autoFailed
        ? `<span class="log-badge timeout">⏱ Timeout</span>`
        : `<span class="log-badge wrong">✗ Wrong</span>`;
      const exprs = q.bubbles.map((e, i) => `${e} = ${q.values[i]}`).join('<br>');
      return `<tr>
        <td>${q.index}</td>
        <td style="font-size:.72rem;max-width:200px;word-break:break-word;line-height:1.6">${exprs}</td>
        <td>${badge}</td>
        <td>${q.elapsed}s</td>
        <td><strong style="color:var(--accent)">L${q.level}</strong> · ${diffName(q.level)}</td>
      </tr>`;
    }).join('');
    html += `</tbody></table>`;

    // ── Actions ───────────────────────────────────────────────────
    html += `<div class="results-actions">
      <button class="btn-primary"  id="res-play-again">▶ Play Again</button>
      <button class="btn-secondary" id="res-home">⌂ Home</button>
    </div>`;

    inner.innerHTML = html;

    $('res-play-again').addEventListener('click', playAgain);
    $('res-home').addEventListener('click', () => {
      showScreen('home');
      renderDailyStrip(); // refresh strip with new session
    });
  }

  // ── Daily strip (home screen) ─────────────────────────────────
  function renderDailyStrip() {
    const strip  = $('daily-strip');
    const days   = Storage.getLastNDays(7);
    const streak = Storage.getCurrentStreak();

    if (days.every(d => !d.played)) { strip.innerHTML = ''; return; }

    let html = '';
    days.forEach(d => {
      const label = d.isToday ? 'Today' : d.date.slice(5); // MM-DD
      const cls   = d.isToday ? 'today' : d.played ? 'done' : 'miss';
      const icon  = d.played ? (d.isToday ? '★' : '✓') : '';
      html += `<div class="daily-dot">
        <div class="daily-dot-circle ${cls}">${icon}</div>
        <div class="daily-dot-label">${label}</div>
      </div>`;
    });

    if (streak > 0) {
      html += `<div class="daily-streak-text">🔥 ${streak}-day streak</div>`;
    }

    strip.innerHTML = html;
  }

  // ── Keyboard handler ──────────────────────────────────────────
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (!screens.game.classList.contains('active')) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx <= 2 && _displayBubbles[idx]) {
        handleBubbleClick(_displayBubbles[idx]);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    showScreen,
    updateModeBadge,
    updateHeader,
    updateTimerDisplay,
    updateExamCountdown,
    setStopBtnVisible,
    renderBubbles,
    markBubbleCorrect,
    revealBubbleValue,
    markBubbleWrong,
    markExamTimeout,
    highlightNextBubble,
    updateSelectionDots,
    showFeedbackToast,
    hideFeedbackToast,
    showRoundOverlay,
    hideRoundOverlay,
    renderResults,
    renderDailyStrip,
    initKeyboard,
  };
})();
