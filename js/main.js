// ═══════════════════════════════════════════════════════════════
//  main.js — Home screen init, event wiring, app entry point
// ═══════════════════════════════════════════════════════════════

(function () {

  // ── Home screen state ─────────────────────────────────────────
  let selectedMode     = 'adaptive';
  let selectedCat      = null;
  let selectedCount    = 30;
  let selectedExamTime = 20;

  // ── initHome ──────────────────────────────────────────────────
  function initHome() {
    // Mode cards
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedMode = card.dataset.mode;
        document.getElementById('weakness-select-wrap').classList.toggle('visible', selectedMode === 'weakness');
        document.getElementById('exam-settings-wrap').classList.toggle('visible', selectedMode === 'exam');
      });
    });

    // Default selection highlight
    document.getElementById('mode-adaptive').classList.add('selected');

    // Category buttons (weakness mode)
    const grid = document.getElementById('cat-grid');
    Object.entries(CAT_LABELS).forEach(([cat, label]) => {
      const btn = document.createElement('button');
      btn.className    = 'cat-btn';
      btn.textContent  = label;
      btn.dataset.cat  = cat;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCat = cat;
      });
      grid.appendChild(btn);
    });

    // Question count buttons
    document.getElementById('count-row').addEventListener('click', e => {
      const btn = e.target.closest('.count-btn');
      if (!btn) return;
      document.querySelectorAll('#count-row .count-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCount = parseInt(btn.dataset.val, 10);
    });

    // Exam time buttons
    document.getElementById('time-row').addEventListener('click', e => {
      const btn = e.target.closest('.count-btn');
      if (!btn) return;
      document.querySelectorAll('#time-row .count-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedExamTime = parseInt(btn.dataset.val, 10);
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', () => {
      if (selectedMode === 'weakness' && !selectedCat) {
        alert('Please select a category for Weakness Mode.');
        return;
      }
      startGame({
        mode:           selectedMode,
        forceCat:       selectedMode === 'weakness' ? selectedCat : null,
        totalQuestions: selectedCount,
        examTimeSec:    selectedExamTime,
      });
    });

    // Next question button (round overlay)
    document.getElementById('next-btn').addEventListener('click', () => {
      UI.hideRoundOverlay();
      UI.hideFeedbackToast();
      if (State.totalQuestions > 0 && State.questionIndex >= State.totalQuestions) {
        endSession();
      } else {
        loadQuestion();
      }
    });

    // Stop button (endless mode)
    document.getElementById('stop-btn').addEventListener('click', () => {
      endSession();
    });

    // Keyboard support
    UI.initKeyboard();

    // Render daily strip
    UI.renderDailyStrip();
  }

  // ── Boot ──────────────────────────────────────────────────────
  initHome();

})();
