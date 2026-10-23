# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript single-page app. chess.js for move legality; custom-built board. Frontend-only prototype: no server yet.

## Users

Chess enthusiasts who want a short daily ritual: open the page once a day, spend about five minutes solving puzzles, share the result, come back tomorrow. Desktop and phone, often in a spare moment (coffee, commute, between meetings).

## Product Purpose

ChessPage is a Wordle-style daily chess puzzle destination. Each day everyone gets the same sequence of 5 puzzles of increasing difficulty, each solvable in under a minute. There is no time limit. Once the day's set is completed it cannot be replayed until tomorrow. Success is a habit: people return daily and keep their streak alive.

## Positioning

Finite, shared and social, where chess.com and Lichess puzzles are endless solo grinding. One set per day, the same for everyone, so results are comparable and worth sharing. Country leaderboards turn a solo puzzle into a light national competition.

## Operating Context

- Daily session tracked on the device. A completed day is locked until the next local day.
- A testing toggle can generate a fresh puzzle set and bypass the lock.
- Intro popup on first visit explains the rules, as Wordle does. A success popup congratulates on completion.
- The share result is plain text plus emoji (Wordle-style) to copy and paste into Slack, chat or social posts.
- Wrong moves are allowed and cost points. The puzzle never auto-reveals. A separate Reveal button exists, and using it marks that puzzle as failed.

## Capabilities and Constraints

- Score combines solve time with the player's daily streak.
- Leaderboards are country-based only, with three categories: Time, Score and Streak. No individual user leaderboard in v1.
- The country is inferred on the client (no backend). Country leaderboard data is simulated in this prototype, with the player's own result merged into their country.
- No sign-in in v1. Google SSO was discussed for future individual leaderboards and is deferred.
- Puzzles come from the Lichess open puzzle database (CC0), are curated by rating band, and never repeat day to day.

## Brand Commitments

- Name: ChessPage.
- References the user named: chess.com, Wordle, Duolingo. Simple and playful.
- Standing preference: a plain, simple interface in the chess.com category standard, nothing fancy. Classic solid white and black piece set, no mixed filled or outlined glyphs. The board must fit the viewport on desktop and mobile without scrolling.

## Evidence on Hand

No real user data, leaderboard data or testimonials exist. Leaderboard numbers in the prototype are synthetic and must be labeled as such where a visitor could mistake them for real.

## Product Principles

1. Five minutes, then done: the finite daily set is the product, not a limitation.
2. Everyone plays the same board: comparability makes sharing and leaderboards meaningful.
3. Forgiving, never punishing: mistakes cost points, not the puzzle.
4. The streak is the hook: protect it and celebrate it.
5. Shareable in plain text: results must survive a paste into any chat.

## Accessibility & Inclusion

Board fully keyboard operable (arrow keys plus Enter to select and move) as well as click/tap and drag. Squares and pieces have screen-reader labels. Colour is never the only signal for right or wrong. Respects prefers-reduced-motion.
