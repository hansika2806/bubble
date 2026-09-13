// ═══════════════════════════════════════════════════════════════
//  game.js — State object + all game lifecycle functions
// ═══════════════════════════════════════════════════════════════

// ── STATE ────────────────────────────────────────────────────────

const State = {
  mode:             'adaptive', // 'learning'|'speed'|'weakness'|'adaptive'|'exam'
  forceCat:         null,
  totalQuestions:   30,         // 0 = endless
  examTimeSec:      20,         // seconds per question in exam mode

  // Current question
  question:         null,
  selectedOrder:    [],         // bubble IDs selected so far this round
  questionIndex:    0,

  // Performance
  score:            0,
  streak:           0,
  correct:          0,
  incorrect:        0,
  sessionLog:       [],
  catStats:         {},         // { cat: { correct, total, totalMs } }

  // Adaptive engine
  adaptive:         null,       // AdaptiveEngine instance
  currentLevel:     1,
  fixedLevel:       null,       // null = progression/adaptive, 1..5 = fixed level

  // Timing
  questionStartTime: 0,         // Date.now() when question started
  roundElapsed:     0,          // seconds elapsed this round
  sessionElapsed:   0,          // seconds elapsed this session
  sessionTimerInt:  null,
  roundTimerInt:    null,
  examTimerInt:     null,       // separate countdown for exam mode
  examRemaining:    0,          // seconds remaining in exam countdown

  // Round flags
  inputLocked:      false,
  roundPerfect:     true,
  roundMistakes:    0,
  autoFailed:       false,      // true if exam timer ran out

  // Within-session expression deduplication
  usedExpressions:  new Set(),

  // Category weights loaded from storage at session start
  catWeights:       {},
};

// ── GAME LIFECYCLE ────────────────────────────────────────────────

function startGame(opts) {
  // opts: { mode, forceCat, totalQuestions, examTimeSec, fixedLevel }
  State.mode           = opts.mode;
  State.forceCat       = opts.forceCat || null;
  State.totalQuestions = opts.totalQuestions; // 0 = endless
  State.examTimeSec    = opts.examTimeSec || 20;
  State.fixedLevel     = opts.fixedLevel || null;

  // Reset all counters
  State.score          = 0;
  State.streak         = 0;
  State.correct        = 0;
  State.incorrect      = 0;
  State.sessionLog     = [];
  State.catStats       = {};
  State.questionIndex  = 0;
  State.usedExpressions = new Set();

  // Clear any leaked timers (fixes the Play Again timer leak bug)
  clearInterval(State.sessionTimerInt);
  clearInterval(State.roundTimerInt);
  clearInterval(State.examTimerInt);

  // Load category weights from storage for spaced repetition
  State.catWeights = Storage.getCatWeights();

  // Set starting adaptive level
  const startLevel = opts.fixedLevel || (opts.mode === 'learning' ? 2 : 1);
  State.adaptive   = new AdaptiveEngine(startLevel);
  State.currentLevel = opts.fixedLevel || (opts.mode === 'exam' ? 1 : State.adaptive.level);

  // Session timer (counts up, for results display)
  State.sessionElapsed = 0;
  State.sessionTimerInt = setInterval(() => { State.sessionElapsed++; }, 1000);

  UI.showScreen('game');
  UI.updateModeBadge(State.mode);
  UI.setStopBtnVisible(State.totalQuestions === 0);
  loadQuestion();
}

function loadQuestion() {
  // Check if session is over
  if (State.totalQuestions > 0 && State.questionIndex >= State.totalQuestions) {
    endSession();
    return;
  }

  // Determine difficulty level:
  if (State.fixedLevel) {
    State.currentLevel = State.fixedLevel;
  } else if (State.mode === 'exam') {
    if (State.totalQuestions > 0) {
      // Divide total questions into 5 progressive stages: Level 1 -> Level 5
      // e.g. 10 questions: Q1-2 (L1), Q3-4 (L2), Q5-6 (L3), Q7-8 (L4), Q9-10 (L5)
      const stage = Math.floor((State.questionIndex / State.totalQuestions) * 5);
      State.currentLevel = clamp(stage + 1, 1, 5);
    } else {
      // Endless / timed exam: step up difficulty every 4 questions
      State.currentLevel = clamp(Math.floor(State.questionIndex / 4) + 1, 1, 5);
    }
  } else {
    State.currentLevel = State.adaptive.level;
  }

  State.question        = generateQuestion(
    State.currentLevel,
    State.forceCat,
    State.usedExpressions,
    State.catWeights
  );
  State.selectedOrder   = [];
  State.inputLocked     = false;
  State.roundPerfect    = true;
  State.roundMistakes   = 0;
  State.autoFailed      = false;
  State.questionStartTime = Date.now();

  UI.updateHeader();
  UI.renderBubbles(State.question, State.mode);
  UI.updateSelectionDots(0);
  startRoundTimer();

  if (State.mode === 'exam') startExamCountdown();
}

// ── TIMERS ────────────────────────────────────────────────────────

function startRoundTimer() {
  clearInterval(State.roundTimerInt);
  State.roundElapsed = 0;
  UI.updateTimerDisplay(State.roundElapsed, State.mode, State.examTimeSec);

  State.roundTimerInt = setInterval(() => {
    State.roundElapsed++;
    UI.updateTimerDisplay(State.roundElapsed, State.mode, State.examTimeSec);
  }, 1000);
}

function stopRoundTimer() {
  clearInterval(State.roundTimerInt);
}

function startExamCountdown() {
  clearInterval(State.examTimerInt);
  State.examRemaining = State.examTimeSec;
  UI.updateExamCountdown(State.examRemaining, State.examTimeSec);

  State.examTimerInt = setInterval(() => {
    State.examRemaining--;
    UI.updateExamCountdown(State.examRemaining, State.examTimeSec);
    if (State.examRemaining <= 0) {
      clearInterval(State.examTimerInt);
      handleExamTimeout();
    }
  }, 1000);
}

function stopExamCountdown() {
  clearInterval(State.examTimerInt);
}

function handleExamTimeout() {
  if (State.inputLocked) return;
  State.inputLocked = true;
  State.roundPerfect = false;
  State.autoFailed   = true;
  stopRoundTimer();

  // Mark remaining unselected bubbles as faded
  UI.markExamTimeout(State.question, State.selectedOrder);
  UI.showFeedbackToast('timeout', '⏱', 'Time Up!', '', '');
  setTimeout(() => {
    UI.hideFeedbackToast();
    completeRound();
  }, 1400);
}

// ── CLICK HANDLER ─────────────────────────────────────────────────

function handleBubbleClick(bubbleId) {
  if (State.inputLocked) return;
  if (State.selectedOrder.includes(bubbleId)) return;

  const bubble   = State.question.bubbles.find(b => b.id === bubbleId);
  const remaining = State.question.bubbles
    .filter(b => !State.selectedOrder.includes(b.id))
    .sort((a, b) => a.value - b.value);

  const minVal    = remaining[0].value;
  const isCorrect = Math.abs(bubble.value - minVal) <= 0.0001;

  if (isCorrect) {
    // ── Correct click ──────────────────────────────────────────
    State.selectedOrder.push(bubbleId);
    UI.markBubbleCorrect(bubbleId, State.selectedOrder.length);
    UI.updateSelectionDots(State.selectedOrder.length);

    if (State.mode === 'learning') {
      UI.revealBubbleValue(bubbleId, bubble.value);
    }

    if (State.selectedOrder.length < 3) {
      UI.highlightNextBubble(State.question, State.selectedOrder, State.mode);
      if (State.mode === 'learning') {
        UI.showFeedbackToast('correct', '✓', 'Correct!',
          `= ${bubble.value}`, bubble.shortcut || '');
      }
    } else {
      // All 3 selected — round complete
      State.inputLocked = true;
      stopRoundTimer();
      stopExamCountdown();

      const delay = State.mode === 'exam' ? 800 : (State.mode === 'learning' ? 700 : 400);
      setTimeout(() => completeRound(), delay);
    }

  } else {
    // ── Wrong click ────────────────────────────────────────────
    State.roundPerfect  = false;
    State.roundMistakes++;
    UI.markBubbleWrong(bubbleId);

    if (State.mode === 'learning') {
      const expected = remaining[0];
      UI.showFeedbackToast('wrong', '✗', 'Wrong!',
        `You clicked: ${round2(bubble.value)}\nSmallest remaining: ${round2(expected.value)}`,
        '');
      // In learning mode, highlight the correct one after shake
      setTimeout(() => {
        UI.highlightNextBubble(State.question, State.selectedOrder, State.mode);
      }, 500);
    } else {
      // Speed / adaptive / exam: brief visual only
      UI.showFeedbackToast('wrong', '✗', '', '', '');
      setTimeout(() => UI.hideFeedbackToast(), 500);
    }

    // Score penalty
    State.score = Math.max(0, State.score - SCORING.wrongPenalty);
    State.streak = 0;
    UI.updateHeader();
  }
}

// ── ROUND COMPLETE ─────────────────────────────────────────────────

function completeRound() {
  const elapsedSec = State.roundElapsed;
  const timeMs     = elapsedSec * 1000;
  const perfect    = State.roundPerfect && !State.autoFailed;

  // ── Score calculation ────────────────────────────────────────
  let pts = 0, speedBonus = 0, streakMult = 1;

  if (perfect) {
    pts = SCORING.base;
    speedBonus = Math.max(0, Math.round(SCORING.maxSpeedBonus * (1 - elapsedSec / SCORING.speedTargetSec)));
    pts += speedBonus;
    State.streak++;
    // Streak multiplier
    for (const [minStreak, mult] of SCORING.streakTiers) {
      if (State.streak >= minStreak) { streakMult = mult; break; }
    }
    pts = Math.round(pts * streakMult);
    State.correct++;
    State.score += pts;
  } else {
    // Partial: earned some points for correct selections, minus mistakes
    const correctSelections = State.selectedOrder.length;
    pts = Math.max(0, correctSelections * 20 - State.roundMistakes * 15);
    State.streak = 0;
    State.incorrect++;
    // pts is not added to score (already penalised during wrong clicks)
  }

  // ── Adaptive update (non-exam modes) ─────────────────────────
  if (State.mode !== 'exam') {
    State.adaptive.update(perfect, timeMs);
  }

  // ── Category stats ───────────────────────────────────────────
  State.question.bubbles.forEach(b => {
    if (!State.catStats[b.cat]) State.catStats[b.cat] = { correct: 0, total: 0, totalMs: 0 };
    State.catStats[b.cat].total++;
    if (perfect) State.catStats[b.cat].correct++;
    State.catStats[b.cat].totalMs += timeMs;
  });

  // ── Session log entry ────────────────────────────────────────
  State.sessionLog.push({
    index:        State.questionIndex + 1,
    bubbles:      State.question.bubbles.map(b => b.expression),
    values:       State.question.bubbles.map(b => b.value),
    correctOrder: State.question.correctOrder,
    selectedOrder:[...State.selectedOrder],
    perfect,
    autoFailed:   State.autoFailed,
    timeMs,
    elapsed:      elapsedSec,
    level:        State.currentLevel,
    pts,
    mistakes:     State.roundMistakes,
    shortcuts:    State.question.bubbles
      .filter(b => b.shortcut)
      .map(b => b.shortcut),
  });

  UI.updateHeader();
  State.questionIndex++;

  // ── Show result ──────────────────────────────────────────────
  if (State.mode === 'exam') {
    // Exam: no overlay — just auto-advance
    if (State.totalQuestions > 0 && State.questionIndex >= State.totalQuestions) {
      endSession();
    } else {
      loadQuestion();
    }
  } else {
    UI.showRoundOverlay(State, { perfect, pts, speedBonus, streakMult, elapsedSec });
  }
}

// ── SESSION END ───────────────────────────────────────────────────

function endSession() {
  clearInterval(State.sessionTimerInt);
  clearInterval(State.roundTimerInt);
  clearInterval(State.examTimerInt);

  // Persist to localStorage
  const log   = State.sessionLog;
  const total = log.length;
  if (total > 0) {
    const correct  = log.filter(q => q.perfect).length;
    const accuracy = Math.round(correct / total * 100);
    const avgTime  = round2(log.reduce((s, q) => s + q.elapsed, 0) / total);
    Storage.saveSession({
      mode:         State.mode,
      totalQ:       total,
      correct,
      accuracy,
      avgTimeSec:   avgTime,
      score:        State.score,
      highestLevel: Math.max(...log.map(q => q.level)),
      catStats:     State.catStats,
    });
    Storage.updateCatWeights(State.catStats);
  }

  UI.showScreen('results');
  UI.renderResults(State);
}

// ── PLAY AGAIN (same settings) ────────────────────────────────────

function playAgain() {
  startGame({
    mode:           State.mode,
    forceCat:       State.forceCat,
    totalQuestions: State.totalQuestions,
    examTimeSec:    State.examTimeSec,
    fixedLevel:     State.fixedLevel,
  });
}
