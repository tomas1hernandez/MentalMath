/* MentalMath — mental math trainer
   Vanilla JS: question generation, visual/audio modes, scoring, persistence. */

(() => {
  "use strict";

  // ---------------------------------------------------------------
  // Difficulty ranges per operation. Each entry generates [a, b].
  // ---------------------------------------------------------------
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const GENERATORS = {
    add: [
      () => [rand(1, 10), rand(1, 10)],
      () => [rand(5, 50), rand(5, 50)],
      () => [rand(10, 100), rand(10, 100)],
      () => [rand(50, 1000), rand(50, 1000)],
    ],
    sub: [
      () => orderDesc(rand(1, 20), rand(1, 10)),
      () => orderDesc(rand(10, 100), rand(10, 100)),
      () => orderDesc(rand(50, 1000), rand(50, 1000)),
    ],
    mul: [
      () => [rand(2, 10), rand(2, 10)],
      () => [rand(2, 12), rand(2, 12)],
      () => [rand(11, 100), rand(2, 10)],
      () => [rand(11, 100), rand(11, 100)],
    ],
    // Division: build from a multiplication so the answer is always whole.
    div: [
      () => { const b = rand(2, 10), q = rand(2, 10); return [b * q, b]; },
      () => { const b = rand(2, 12), q = rand(2, 12); return [b * q, b]; },
      () => { const b = rand(2, 9), q = rand(11, 111); return [b * q, b]; },
    ],
    // Percentages: [percent, base]. Base is a multiple of 100/gcd(p,100)
    // so that p% of base is always a whole number.
    pct: [
      () => { const p = [10, 20, 25, 50, 75][rand(0, 4)]; return [p, pctBase(p, 12)]; },
      () => { const p = 5 * rand(1, 19); return [p, pctBase(p, 10)]; },
      () => { const p = rand(1, 99); return [p, pctBase(p, 8)]; },
    ],
  };

  function orderDesc(x, y) { return x >= y ? [x, y] : [y, x]; }

  function gcd(x, y) { return y === 0 ? x : gcd(y, x % y); }

  function pctBase(p, maxMultiples) {
    const step = 100 / gcd(p, 100);
    return step * rand(1, maxMultiples);
  }

  const OP_META = {
    add: { calc: (a, b) => a + b,       fmt: (a, b) => `${a} + ${b}`,    say: (a, b) => `${a} plus ${b}` },
    sub: { calc: (a, b) => a - b,       fmt: (a, b) => `${a} − ${b}`,    say: (a, b) => `${a} minus ${b}` },
    mul: { calc: (a, b) => a * b,       fmt: (a, b) => `${a} × ${b}`,    say: (a, b) => `${a} times ${b}` },
    div: { calc: (a, b) => a / b,       fmt: (a, b) => `${a} ÷ ${b}`,    say: (a, b) => `${a} divided by ${b}` },
    pct: { calc: (a, b) => a * b / 100, fmt: (a, b) => `${a}% of ${b}`,  say: (a, b) => `${a} percent of ${b}` },
  };

  const OPS = Object.keys(OP_META);

  // ---------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const screens = {
    setup: $("screen-setup"),
    quiz: $("screen-quiz"),
    results: $("screen-results"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $("tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  // ---------------------------------------------------------------
  // Settings (persisted in localStorage)
  // ---------------------------------------------------------------
  const SETTINGS_KEY = "mentalmath-settings";

  function readSettingsFromUI() {
    const ops = {};
    OPS.forEach((op) => {
      ops[op] = {
        enabled: $("op-" + op).checked,
        range: Number($("range-" + op).value),
      };
    });
    return {
      ops,
      mode: $("mode-audio").classList.contains("active") ? "audio" : "visual",
      session: {
        type: document.querySelector('input[name="session-type"]:checked').value,
        questions: clamp(Number($("session-questions").value) || 20, 1, 500),
        seconds: clamp(Number($("session-seconds").value) || 60, 10, 3600),
      },
    };
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function applySettingsToUI(s) {
    if (!s) return;
    OPS.forEach((op) => {
      if (s.ops && s.ops[op]) {
        $("op-" + op).checked = s.ops[op].enabled;
        $("range-" + op).value = String(s.ops[op].range);
        syncTopicRow(op);
      }
    });
    if (s.mode) setMode(s.mode);
    if (s.session && typeof s.session === "object") {
      const radio = document.querySelector(`input[name="session-type"][value="${s.session.type}"]`);
      if (radio) radio.checked = true;
      if (s.session.questions) $("session-questions").value = s.session.questions;
      if (s.session.seconds) $("session-seconds").value = s.session.seconds;
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(readSettingsFromUI())); } catch (_) {}
  }

  function loadSettings() {
    try { applySettingsToUI(JSON.parse(localStorage.getItem(SETTINGS_KEY))); } catch (_) {}
  }

  function syncTopicRow(op) {
    const row = document.querySelector(`.topic-row[data-op="${op}"]`);
    row.classList.toggle("disabled", !$("op-" + op).checked);
  }

  OPS.forEach((op) => {
    $("op-" + op).addEventListener("change", () => { syncTopicRow(op); saveSettings(); });
    $("range-" + op).addEventListener("change", saveSettings);
  });
  document.querySelectorAll('input[name="session-type"]').forEach((r) =>
    r.addEventListener("change", saveSettings)
  );
  $("session-questions").addEventListener("change", saveSettings);
  $("session-seconds").addEventListener("change", saveSettings);

  // Mode toggle
  function setMode(mode) {
    $("mode-visual").classList.toggle("active", mode === "visual");
    $("mode-audio").classList.toggle("active", mode === "audio");
    $("audio-hint").hidden = mode !== "audio";
  }
  $("mode-visual").addEventListener("click", () => { setMode("visual"); saveSettings(); });
  $("mode-audio").addEventListener("click", () => { setMode("audio"); saveSettings(); });

  // ---------------------------------------------------------------
  // Speech (listened mode)
  // ---------------------------------------------------------------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang && v.lang.startsWith("en"));
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  function speakProblem(q) {
    // Just the problem itself — "5 plus 9" — no filler words.
    speak(OP_META[q.op].say(q.a, q.b));
  }

  // Some browsers load voices asynchronously; warm them up.
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices();

  // ---------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------
  const game = {
    settings: null,
    enabledOps: [],
    current: null,
    questionStart: 0,
    asked: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    totalAnswerMs: 0,
    missed: [],
    totalQuestions: 0,  // 0 = timed mode
    timeLimit: 0,       // seconds, 0 = question-count mode
    timerHandle: null,
    timeLeft: 0,
    locked: false,      // input locked during wrong-answer pause
  };

  function makeQuestion() {
    const op = game.enabledOps[rand(0, game.enabledOps.length - 1)];
    const range = game.settings.ops[op].range;
    const [a, b] = GENERATORS[op][range]();
    return { op, a, b, answer: OP_META[op].calc(a, b) };
  }

  function questionText(q) {
    return OP_META[q.op].fmt(q.a, q.b);
  }

  function startGame() {
    const settings = readSettingsFromUI();
    const enabledOps = OPS.filter((op) => settings.ops[op].enabled);
    if (enabledOps.length === 0) {
      $("setup-error").hidden = false;
      return;
    }
    $("setup-error").hidden = true;
    saveSettings();

    Object.assign(game, {
      settings, enabledOps,
      asked: 0, correct: 0, streak: 0, bestStreak: 0,
      totalAnswerMs: 0, missed: [], locked: false,
      totalQuestions: 0, timeLimit: 0, timeLeft: 0,
    });

    if (settings.session.type === "questions") {
      game.totalQuestions = settings.session.questions;
    } else {
      game.timeLimit = settings.session.seconds;
      game.timeLeft = game.timeLimit;
    }

    // UI prep
    const audio = settings.mode === "audio";
    $("problem-text").hidden = audio;
    $("audio-controls").hidden = !audio;
    $("quiz-timer").hidden = !game.timeLimit;
    $("feedback").textContent = "";
    $("feedback").className = "feedback";

    showScreen("quiz");

    $("quiz-bar").style.width = "0%";

    if (game.timeLimit) {
      $("quiz-timer").textContent = game.timeLeft + "s";
      game.timerHandle = setInterval(() => {
        game.timeLeft--;
        $("quiz-timer").textContent = game.timeLeft + "s";
        $("quiz-bar").style.width = ((1 - game.timeLeft / game.timeLimit) * 100) + "%";
        if (game.timeLeft <= 0) endGame();
      }, 1000);
    }

    nextQuestion();
  }

  function nextQuestion() {
    game.current = makeQuestion();
    game.asked++;
    game.questionStart = Date.now();
    game.locked = false;

    $("quiz-progress").textContent = game.totalQuestions
      ? `${game.asked} / ${game.totalQuestions}`
      : `Question ${game.asked}`;
    if (game.totalQuestions) {
      $("quiz-bar").style.width = (((game.asked - 1) / game.totalQuestions) * 100) + "%";
    }
    $("quiz-score").textContent = "Score: " + game.correct;
    $("quiz-streak").textContent = "🔥 " + game.streak;
    $("problem-text").textContent = questionText(game.current);
    $("answer-input").value = "";
    $("answer-input").focus();

    if (game.settings.mode === "audio") speakProblem(game.current);
  }

  function setFeedback(text, cls) {
    const el = $("feedback");
    el.textContent = text;
    el.className = "feedback" + (cls ? " " + cls : "");
  }

  function submitAnswer() {
    if (game.locked || !game.current) return;
    const raw = $("answer-input").value.trim();
    if (raw === "" || isNaN(Number(raw))) return;

    const elapsed = Date.now() - game.questionStart;
    game.totalAnswerMs += elapsed;
    const q = game.current;
    const isRight = Number(raw) === q.answer;

    if (isRight) {
      game.correct++;
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      setFeedback("✔ Correct!", "good");
      if (game.settings.mode === "audio") speak("Correct!");
      advanceOrEnd(350);
    } else {
      game.streak = 0;
      game.missed.push({ text: questionText(q), answer: q.answer, given: raw });
      setFeedback(`✘ ${questionText(q)} = ${q.answer}`, "bad");
      if (game.settings.mode === "audio") {
        speak(`${OP_META[q.op].say(q.a, q.b)} is ${q.answer}`);
      }
      advanceOrEnd(1800);
    }
  }

  function skipQuestion() {
    if (game.locked || !game.current) return;
    const q = game.current;
    game.streak = 0;
    game.missed.push({ text: questionText(q), answer: q.answer, given: "(skipped)" });
    setFeedback(`Skipped — ${questionText(q)} = ${q.answer}`, "bad");
    advanceOrEnd(1200);
  }

  function advanceOrEnd(delayMs) {
    game.locked = true;
    const finished = game.totalQuestions && game.asked >= game.totalQuestions;
    setTimeout(() => {
      if (finished) {
        endGame();
      } else if (screens.quiz.classList.contains("active")) {
        setFeedback("", "");
        nextQuestion();
      }
    }, delayMs);
  }

  function endGame() {
    if (game.timerHandle) { clearInterval(game.timerHandle); game.timerHandle = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    game.current = null;

    const answered = game.correct + game.missed.length;
    const accuracy = answered ? Math.round((game.correct / answered) * 100) : 0;
    const avgSec = answered ? (game.totalAnswerMs / answered / 1000).toFixed(1) : "0";

    $("res-score").textContent = game.correct;
    $("res-accuracy").textContent = accuracy + "%";
    $("res-speed").textContent = avgSec + "s";
    $("res-best-streak").textContent = game.bestStreak;

    const missedCard = $("missed-card");
    const list = $("missed-list");
    list.innerHTML = "";
    if (game.missed.length) {
      missedCard.hidden = false;
      game.missed.forEach((m) => {
        const li = document.createElement("li");
        const problem = document.createElement("span");
        problem.textContent = m.text + " =";
        const wrong = document.createElement("span");
        wrong.className = "your-answer";
        wrong.textContent = m.given;
        const right = document.createElement("span");
        right.className = "right-answer";
        right.textContent = m.answer;
        li.append(problem, wrong, right);
        list.appendChild(li);
      });
    } else {
      missedCard.hidden = true;
    }

    showScreen("results");
  }

  // ---------------------------------------------------------------
  // Wire up controls
  // ---------------------------------------------------------------
  $("btn-start").addEventListener("click", startGame);

  $("answer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitAnswer();
  });

  $("btn-skip").addEventListener("click", skipQuestion);
  $("btn-quit").addEventListener("click", endGame);
  $("btn-again").addEventListener("click", startGame);
  $("btn-setup").addEventListener("click", () => showScreen("setup"));

  $("btn-repeat").addEventListener("click", () => {
    if (game.current) speakProblem(game.current);
    $("answer-input").focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "r" && e.key !== "R") return;
    if (!screens.quiz.classList.contains("active")) return;
    if (!game.settings || game.settings.mode !== "audio") return;
    // Allow R from anywhere, including the answer box while it's empty —
    // an "r" is never part of a numeric answer anyway.
    if (document.activeElement === $("answer-input") && $("answer-input").value !== "") return;
    e.preventDefault();
    if (game.current) speakProblem(game.current);
  });

  // Init
  loadSettings();
  OPS.forEach(syncTopicRow);
})();
