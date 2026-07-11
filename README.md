# 🧠 MentalMath

A mental math training game for practicing **addition, subtraction, multiplication, division, percentages, and real-life money problems** — right in the browser, no install needed.

Live at **[math.tomaslife.com](https://math.tomaslife.com)**.

## Features

- **Configurable math topics** — toggle each operation on/off and choose its difficulty range independently:
  - Addition: up to 10+10, 50+50, 100+100, or 1000+1000
  - Subtraction: up to 20−10, 100−100, or 1000−1000 (answers are never negative)
  - Multiplication: tables to 10×10 or 12×12, or up to 100×10 / 100×100
  - Division: tables to 100÷10 or 144÷12, or up to 999÷9 (answers are always whole numbers)
  - Percentages: easy (10/25/50/75%), multiples of 5%, or any percent — answers are always whole numbers
  - Real life: word problems with money, Mexican-cash flavored 🇲🇽 — three levels:
    - *Everyday cash*: change at the OXXO, counting bills, unit prices (dozen eggs, tacos)
    - *Big cash*: how many $500 bills make $47,000, splitting dinner bills, tips, rent, USD→MXN
    - *Business*: market cap from price × shares, price per share, EPS, revenue, profit per unit
- **Visual or Listened mode** — see the problem on screen, or hear it spoken aloud (text-to-speech) to train working memory. Press `R` to repeat the audio. Speech is minimal: just "5 plus 9", no filler.
- **Session types** — choose your own number of exercises (1–500) or your own time limit (10–3600 seconds).
- **Score, streaks, and timing** — accuracy, best streak, and average seconds per question, plus a review of every missed problem at the end.
- **Techniques tab** — mental math strategies with worked examples (left-to-right addition, round-and-compensate, counting up, ×5/×9/×11 tricks, doubling-halving, division by chunking, and more).
- Settings persist between visits via `localStorage`.

## Running it

It's a static site — just open `index.html` in a browser, or serve the folder:

```
npx serve .
```

Listened mode uses the Web Speech API (built into Chrome, Edge, and Safari).

## Stack

Vanilla HTML / CSS / JavaScript. No dependencies, no build step.

## Deploying

Hosted on Cloudflare Workers (static assets) at `math.tomaslife.com`. Deploys are manual:

```
npx wrangler deploy
```
