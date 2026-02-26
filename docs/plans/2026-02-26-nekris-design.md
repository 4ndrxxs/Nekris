# NEKRIS Design Document

## Overview
Transform "Stretchy Cat" (single-player path-building puzzle) into NEKRIS — a multiplayer competitive game with TETRIO-style ranking at nekris.online.

## Decisions Made
- **Approach**: Sequential implementation (Engine → Supabase → Daily → PartyKit → Race → Polish)
- **WATER cells**: Activated (non-path cells become WATER, stepping resets level)
- **Collectible expiry**: Kept (TREAT/YARN disappear after time limit)
- **Deployment**: TBD (local dev first)
- **Supabase**: Not yet created (schema prepared in spec)
- **Animations**: Maximized — TETRIO-level dynamism throughout

## Stack
- **Engine**: Pure TS package, 0 dependencies, `packages/engine/`
- **Web**: Next.js 15 App Router + Tailwind v4, `apps/web/`
- **Realtime**: PartyKit (Cloudflare Durable Objects), `apps/party/`
- **DB/Auth**: Supabase (Postgres + Auth + Edge Functions)
- **Monorepo**: pnpm workspace
- **Test**: Vitest
- **Animation**: Framer Motion + CSS transforms

---

## 1. Engine Package (`packages/engine`)

### CellType (numeric enum)
```
EMPTY=0, START=1, WATER=2, COUCH=3, PLANT=4, BOX=5, TREAT=6, YARN=7, SAUCER=8
```
Removed: SOCK, STAR (dead code from original).

### Core Types
- `EngineState`: path, score, levelScore, collectedSet, isWon, moveCount
- `MoveResult`: { state, effects, valid }
- `GameEffect`: AUDIO | TIMER_ADD | WATER_RESET | WIN | LEVEL_ADVANCE
- `LevelData`: grid, startPoint, endPoint, path, gridSize

### processMove(state, point, level, options?) → MoveResult
Pure function. 14 rules extracted from App.tsx handleCellInteraction (lines 170-233):
1. Can't move if already won
2. Backspace: click second-to-last → remove last cell
3. Can't click non-adjacent cell
4. Can't click already-in-path cell
5. Can't click obstacle (COUCH/PLANT/BOX)
6. WATER cell: reset level (WATER_RESET effect)
7. TREAT collection: TIMER_ADD +5s, AUDIO fish
8. YARN collection: +50 score, AUDIO yarn
9. Normal step: +10 score, AUDIO stretch
10. Reaching SAUCER: AUDIO goal
11. Win: all non-obstacle cells filled AND on SAUCER
12. Win → AUDIO win + LEVEL_ADVANCE
13. Track collected items in set (prevent double-collect)
14. Return effects as data (no side effects)

Options parameter includes `isTreatActive`/`isYarnActive` flags — expired collectibles treated as EMPTY.

### Bug Fix
Original `initLevel()` never saved `levelStartScore`. Engine tracks `levelScore` separately from `score`.

### PRNG (mulberry32)
`createPRNG(seed) → () => number` — deterministic random number generator.

### Level Generator
`generateLevel(levelIndex, rng) → LevelData`
- Replace all 6 `Math.random()` calls with `rng()`
- WALLS_KILL_YOU = true (non-path cells become WATER)
- Simplified output: gridSize, grid, startPoint, endPoint, path

### Mirror Map
`mirrorLevel(level) → LevelData` — reverse each row, flip all x-coordinates.

### Validation
`replayMoves(seed, levelIndex, moves[]) → { valid, finalScore }`
Server regenerates level from seed, replays all moves through processMove.

### Scoring
`calculateElo(ratingA, ratingB, aWon, K=32) → { newA, newB, change }`
`getTier(elo) → Tier` — Bronze(<800), Silver(<1000), Gold(<1200), Platinum(<1400), Diamond(<1600), Master(1600+)

---

## 2. Database & Auth (Supabase)

### Schema
- **profiles**: id, username, elo(1000), tier('Silver'), wins(0), losses(0), created_at
- **matches**: player_a, player_b, winner, scores, times, elo_change, seed, mode
- **daily_seeds**: date (PK), seed, level_index
- **daily_runs**: user_id, date, score, time_ms, moves (JSONB), unique(user_id, date)

### RLS
- profiles: public read, own update
- matches: public read, service role insert only
- daily_seeds: public read, service role insert only
- daily_runs: public read, own insert (1/day)

### Auth
- Google OAuth (primary)
- Anonymous auth (quick play, linkable to Google later)
- Auto-create profile trigger on auth.users insert

### Daily Seed
- Edge Function + pg_cron at UTC midnight
- Seed = random integer, level_index cycles 1-12

---

## 3. Network Architecture (PartyKit)

### MatchmakingServer (Durable Object)
- Queue: { userId, ws, elo, joinedAt }[]
- Match: closest ELO pair, expand range ±50 every 5s
- On match: create GameRoom, send MATCH_FOUND

### GameRoomServer (Durable Object)
- Flow: MATCH_FOUND → both READY → COUNTDOWN(3s) → GAME_START → relay MOVEs → both FINISH → replayMoves() verify → MATCH_RESULT
- Disconnect: 30s timeout → opponent wins
- Mirror: Player A gets original, Player B gets mirrorLevel()
- Security: Supabase JWT validation, move replay verification, 50ms min interval

### WebSocket Protocol
Client→Server: QUEUE_JOIN, QUEUE_LEAVE, READY, MOVE, FINISH
Server→Client: QUEUE_STATUS, MATCH_FOUND, GAME_INIT, COUNTDOWN, GAME_START, OPPONENT_MOVE, OPPONENT_FINISH, MATCH_RESULT, OPPONENT_DISCONNECT, ERROR

---

## 4. UI & Game Flow (Next.js App Router)

### Pages
- `/` — Lobby (Daily/Race selection, profile summary)
- `/play/daily` — Daily mode (seeded single play + leaderboard)
- `/play/race` — 1v1 Quick Race (matchmaking → game → result)
- `/leaderboard` — Global/daily leaderboard
- `/profile` — My profile (ELO, tier, match history)

### Theme (TETRIO Dark)
- BG: #0a0a0a, Surface: #1a1a2e, Accent: #00ff88
- Text: #e0e0e0, Muted: #666
- Font: Inter (UI) + monospace (stats)
- Grid: neon/dark style (replace original gradient bg)
- Cat head SVG: kept, colors adjusted to theme

### Layout
- Desktop (Quick Race): My board 70% left + Opponent minimap 30% right
- Mobile: Tab switch (My Board / Opponent), progress bar on my board tab
- Touch drag support (reuse original onTouchMove logic)

### React Hooks
- `useGameEngine(seed, levelIndex)` — Engine init + processMove wrapper + effects handler
- `usePartySocket(roomId)` — PartyKit connection + message send/receive
- `useOpponentState()` — Opponent progress state management
- `useAudio()` — Reuse original pattern, local assets in /public/audio/

---

## 5. Animations (TETRIO-level dynamism)

### Cell/Path
- Path expansion: scale 0→1 + bounce easing (spring physics)
- Backspace: shrink + fade + slight shake on removed cell
- Cat head: squash & stretch on move, idle eye blink animation
- Path pulse: subtle gradient glow wave along entire path

### Collectibles
- TREAT/YARN: idle bounce, fast blink + shrink near expiry
- Collection: particle burst + floating score text (enhanced float-up)
- TREAT collect: "+5s" text flies to timer position

### Win/Lose
- Level clear: wave ripple across grid + sequential cell glow
- Final win: full-screen confetti particle explosion + score count-up
- Game over: cells collapse top-to-bottom (tetris-style)

### Quick Race
- Match found: opponent profile slide-in + VS screen (fighting game style)
- Countdown: 3-2-1-GO! center screen large text + zoom-in + shake
- Opponent moves: real-time path expansion on minimap with ghost trail
- Result: ELO number rolls like slot machine then settles

### Transitions
- Page transitions: Framer Motion layout animations
- Level transitions: current grid fade+scale out → new grid fade+scale in
- All numbers (score, ELO, timer): spring-based counter animation

### Tech
- Framer Motion for orchestration
- CSS transforms/opacity for performance-critical paths
- requestAnimationFrame for particle systems

---

## 6. Implementation Order

1. `packages/engine` — types, prng, levelGenerator, mirrorMap, gameEngine, scoring, protocol, validation. Vitest tests.
2. Supabase — schema SQL, auth setup, profile trigger, daily seed edge function.
3. `apps/web` Daily Mode — Next.js scaffold, daily page, engine integration, score submission, leaderboard.
4. `apps/party` — PartyKit matchmaking + game room servers.
5. `apps/web` Quick Race — matchmaking UI, game room, opponent minimap, result screen.
6. Polish — lobby, profile, global leaderboard, all animations, audio, mobile optimization.

Each step has clear exit criteria defined in the implementation spec.
