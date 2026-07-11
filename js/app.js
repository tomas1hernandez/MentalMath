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
    // Real-life word problems. Unlike the ops above, each generator
    // returns a full {text, say, answer} object instead of an [a, b] pair.
    life: [
      () => lifeProblem(0),
      () => lifeProblem(1),
      () => lifeProblem(2),
    ],
  };

  function orderDesc(x, y) { return x >= y ? [x, y] : [y, x]; }

  function gcd(x, y) { return y === 0 ? x : gcd(y, x % y); }

  function pctBase(p, maxMultiples) {
    const step = 100 / gcd(p, 100);
    return step * rand(1, maxMultiples);
  }

  // ---------------------------------------------------------------
  // Real-life problems: cash the Mexican way (bills, change, tacos),
  // household money, and business/investing numbers.
  // Every template returns { text, say, answer } — answer always whole.
  // ---------------------------------------------------------------
  const pick = (arr) => arr[rand(0, arr.length - 1)];
  const money = (n) => "$" + n.toLocaleString("en-US");

  const LIFE_TEMPLATES = [
    // Level 0 — everyday cash
    [
      () => { // change from a bill
        const place = pick(["at the OXXO", "at the taquería", "at the supermarket", "at the pharmacy", "at the tianguis"]);
        const bill = pick([50, 100, 200, 500]);
        const total = rand(Math.max(1, Math.floor(bill * 0.2)), bill - 1);
        return {
          text: `Your total ${place} is ${money(total)} pesos and you pay with a ${money(bill)} bill. How much change do you get?`,
          say: `Your total ${place} is ${total} pesos, and you pay with a ${bill} peso bill. How much change do you get?`,
          answer: bill - total,
        };
      },
      () => { // count bills, small totals
        const d = pick([20, 50, 100, 200]);
        const count = rand(3, 15);
        return {
          text: `You need to pay ${money(d * count)} pesos using only ${money(d)} bills. How many bills is that?`,
          say: `You need to pay ${d * count} pesos using only ${d} peso bills. How many bills is that?`,
          answer: count,
        };
      },
      () => { // egg dozen unit price
        const unit = rand(2, 9);
        return {
          text: `A dozen eggs costs ${money(unit * 12)} pesos. How much does each egg cost?`,
          say: `A dozen eggs costs ${unit * 12} pesos. How much does each egg cost?`,
          answer: unit,
        };
      },
      () => { // tacos unit price
        const n = rand(3, 8);
        const unit = pick([12, 15, 18, 20, 22, 25, 30]);
        return {
          text: `${n} tacos cost ${money(n * unit)} pesos in total. How much is each taco?`,
          say: `${n} tacos cost ${n * unit} pesos in total. How much is each taco?`,
          answer: unit,
        };
      },
      () => { // multi-pack unit price
        const n = pick([4, 6, 10, 12]);
        const unit = rand(8, 25);
        return {
          text: `A pack of ${n} sodas costs ${money(n * unit)} pesos. What is the price per soda?`,
          say: `A pack of ${n} sodas costs ${n * unit} pesos. What is the price per soda?`,
          answer: unit,
        };
      },
    ],
    // Level 1 — big cash
    [
      () => { // count bills, big totals (the "47k in 500s" case)
        const d = pick([100, 200, 500, 1000]);
        const count = rand(12, 120);
        return {
          text: `You have to pay ${money(d * count)} pesos in cash. How many ${money(d)} bills do you need?`,
          say: `You have to pay ${(d * count).toLocaleString("en-US")} pesos in cash. How many ${d} peso bills do you need?`,
          answer: count,
        };
      },
      () => { // bank withdrawal in one denomination
        const d = pick([200, 500]);
        const count = rand(10, 100);
        return {
          text: `The bank pays out ${money(d * count)} pesos entirely in ${money(d)} bills. How many bills do they hand you?`,
          say: `The bank pays out ${(d * count).toLocaleString("en-US")} pesos entirely in ${d} peso bills. How many bills do they hand you?`,
          answer: count,
        };
      },
      () => { // split the bill
        const people = rand(3, 6);
        const each = 5 * rand(16, 90);
        return {
          text: `A dinner bill of ${money(people * each)} pesos is split evenly between ${people} friends. How much does each person pay?`,
          say: `A dinner bill of ${people * each} pesos is split evenly between ${people} friends. How much does each person pay?`,
          answer: each,
        };
      },
      () => { // tip
        const p = pick([10, 15, 20]);
        const bill = 20 * rand(5, 50);
        return {
          text: `Your restaurant bill is ${money(bill)} pesos and you want to leave a ${p}% tip. How many pesos is the tip?`,
          say: `Your restaurant bill is ${bill} pesos and you want to leave a ${p} percent tip. How many pesos is the tip?`,
          answer: bill * p / 100,
        };
      },
      () => { // yearly rent
        const rent = 500 * rand(6, 30);
        return {
          text: `Your rent is ${money(rent)} pesos a month. How much rent do you pay in a full year?`,
          say: `Your rent is ${rent.toLocaleString("en-US")} pesos a month. How much rent do you pay in a full year?`,
          answer: rent * 12,
        };
      },
      () => { // weekly wage
        const daily = 50 * rand(6, 18);
        return {
          text: `You earn ${money(daily)} pesos a day. How much do you make in a 6-day work week?`,
          say: `You earn ${daily} pesos a day. How much do you make in a 6 day work week?`,
          answer: daily * 6,
        };
      },
      () => { // dollars → pesos
        const rate = pick([17, 18, 19, 20]);
        const usd = pick([5, 10, 20, 25, 40, 50, 100]);
        return {
          text: `One US dollar is worth ${rate} pesos. How many pesos are ${usd} dollars?`,
          say: `One US dollar is worth ${rate} pesos. How many pesos are ${usd} dollars?`,
          answer: rate * usd,
        };
      },
    ],
    // Level 2 — business & investing
    [
      () => { // market cap = price × shares
        const price = pick([5, 10, 20, 25, 40, 50, 80, 100, 150, 200]);
        const shares = pick([1, 2, 4, 5, 10, 20, 50]);
        return {
          text: `A company's stock trades at ${money(price)} and it has ${shares} million shares outstanding. What is its market cap, in millions of dollars?`,
          say: `A company's stock trades at ${price} dollars, and it has ${shares} million shares outstanding. What is its market cap, in millions of dollars?`,
          answer: price * shares,
        };
      },
      () => { // price per share from market cap
        const price = pick([5, 10, 20, 25, 50, 100]);
        const shares = pick([2, 4, 5, 10, 20]);
        return {
          text: `A company has a market cap of ${money(price * shares)} million and ${shares} million shares outstanding. What is the price of one share, in dollars?`,
          say: `A company has a market cap of ${price * shares} million dollars and ${shares} million shares outstanding. What is the price of one share, in dollars?`,
          answer: price,
        };
      },
      () => { // earnings per share
        const eps = rand(2, 12);
        const shares = pick([2, 4, 5, 10, 25]);
        return {
          text: `A company earns ${money(eps * shares)} million in profit and has ${shares} million shares. What are the earnings per share, in dollars?`,
          say: `A company earns ${eps * shares} million dollars in profit and has ${shares} million shares. What are the earnings per share, in dollars?`,
          answer: eps,
        };
      },
      () => { // revenue
        const units = pick([50, 80, 100, 150, 200, 250]);
        const price = rand(15, 120);
        return {
          text: `A food stand sells ${units} plates at ${money(price)} pesos each. What is the total revenue, in pesos?`,
          say: `A food stand sells ${units} plates at ${price} pesos each. What is the total revenue, in pesos?`,
          answer: units * price,
        };
      },
      () => { // profit per unit
        const cost = rand(20, 80);
        const sale = cost + rand(10, 60);
        return {
          text: `A product costs ${money(cost)} pesos to make and sells for ${money(sale)} pesos. What is the profit per unit?`,
          say: `A product costs ${cost} pesos to make and sells for ${sale} pesos. What is the profit per unit?`,
          answer: sale - cost,
        };
      },
      () => { // pesos → dollars
        const rate = pick([17, 18, 20, 25]);
        const usd = rand(10, 90);
        return {
          text: `The exchange rate is ${rate} pesos per dollar. How many dollars are ${money(rate * usd)} pesos?`,
          say: `The exchange rate is ${rate} pesos per dollar. How many dollars are ${(rate * usd).toLocaleString("en-US")} pesos?`,
          answer: usd,
        };
      },
    ],
  ];

  function lifeProblem(level) {
    return pick(LIFE_TEMPLATES[level])();
  }

  const OP_META = {
    add: { calc: (a, b) => a + b,       fmt: (a, b) => `${a} + ${b}`,    say: (a, b) => `${a} plus ${b}` },
    sub: { calc: (a, b) => a - b,       fmt: (a, b) => `${a} − ${b}`,    say: (a, b) => `${a} minus ${b}` },
    mul: { calc: (a, b) => a * b,       fmt: (a, b) => `${a} × ${b}`,    say: (a, b) => `${a} times ${b}` },
    div: { calc: (a, b) => a / b,       fmt: (a, b) => `${a} ÷ ${b}`,    say: (a, b) => `${a} divided by ${b}` },
    pct: { calc: (a, b) => a * b / 100, fmt: (a, b) => `${a}% of ${b}`,  say: (a, b) => `${a} percent of ${b}` },
  };

  // "life" has no OP_META entry — its questions carry their own text/say.
  const OPS = Object.keys(GENERATORS);

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
    speak(q.say || OP_META[q.op].say(q.a, q.b));
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
    if (op === "life") {
      const p = GENERATORS.life[range]();
      return { op, text: p.text, say: p.say, answer: p.answer };
    }
    const [a, b] = GENERATORS[op][range]();
    return { op, a, b, answer: OP_META[op].calc(a, b) };
  }

  function questionText(q) {
    return q.text || OP_META[q.op].fmt(q.a, q.b);
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
    $("problem-text").classList.toggle("word", !!game.current.text);
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
    // Allow commas in big answers ("102,000") — strip before parsing.
    const raw = $("answer-input").value.trim().replace(/,/g, "");
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
      // Word problems are too long to restate — just give the answer.
      setFeedback(q.text ? `✘ The answer is ${q.answer}` : `✘ ${questionText(q)} = ${q.answer}`, "bad");
      if (game.settings.mode === "audio") {
        speak(q.text ? `The answer is ${q.answer}` : `${OP_META[q.op].say(q.a, q.b)} is ${q.answer}`);
      }
      advanceOrEnd(1800);
    }
  }

  function skipQuestion() {
    if (game.locked || !game.current) return;
    const q = game.current;
    game.streak = 0;
    game.missed.push({ text: questionText(q), answer: q.answer, given: "(skipped)" });
    setFeedback(q.text ? `Skipped — the answer is ${q.answer}` : `Skipped — ${questionText(q)} = ${q.answer}`, "bad");
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
