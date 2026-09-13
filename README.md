# Bubble Game — Accenture Practice Simulator

A focused, distraction-free practice simulator designed to master the Accenture-style Bubble Game assessment over structured preparation cycles.

## 🎯 Overview

In each round, 3 mathematical expressions are shown in floating bubbles. The objective is to calculate or estimate their values and click the bubbles from **smallest to largest**.

### 🌟 Features

- **Exam Simulation Mode**:
  - Configurable timers (5m, 8m, 10m).
  - Target question counts (10, 20, 30, or unlimited).
  - Strict exam conditions: immediate answers are withheld until completion.
  - Comprehensive performance breakdown (accuracy, speed per question, category strengths/weaknesses).
- **Learning & Drill Modes**:
  - Instant mental-math shortcuts and step-by-step value breakdown.
  - Non-blocking error handling: inspect values and keep practicing smoothly.
  - Category isolation to drill specific problem areas (Percentages, Fractions, Exponents, Multiplications, Combined).
- **Anti-Memorization Engine**:
  - 37 dynamic template generators across 5 difficulty tiers.
  - Dynamic value ranges with tight numerical spreads ($\Delta \le 3$ in higher levels).
  - Session-level tracking prevents duplicate expressions from repeating.
- **Ergonomic Keyboard Controls**:
  - Press `1`, `2`, or `3` (mapped to bubbles from left to right) for rapid physical response training.
- **Local Progress Tracking**:
  - Stores session history and historical category accuracy in `localStorage`.
  - Tracks training streaks and daily activity strips on the home screen.

## 🚀 How to Run

No build tools or servers required!
1. Clone or download the repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

## 📁 Project Structure

```
bubble/
├── index.html        # Main HTML entry point
├── css/
│   └── style.css     # Dark-mode styling, animations, and layouts
└── js/
    ├── config.js     # Constants, categories, thresholds, and math helpers
    ├── templates.js  # 37 dynamic mathematical expression generators
    ├── engine.js     # Adaptive engine, spread controller, and repeat prevention
    ├── storage.js    # LocalStorage persistence and category weights
    ├── game.js       # Game lifecycle, timer loop, and exam scoring
    ├── ui.js         # DOM updates, bubble rendering, and keyboard inputs
    └── main.js       # App entry point and UI event wiring
```
