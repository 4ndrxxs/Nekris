<p align="center">
  <img src="https://img.shields.io/badge/NEKRIS-00ff88?style=for-the-badge&logoColor=black&labelColor=0a0a0a" alt="NEKRIS" height="40"/>
</p>

<h1 align="center">
  <strong>NEKRIS</strong>
</h1>

<p align="center">
  <em>Competitive multiplayer puzzle game inspired by TETRIO</em>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js"/></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest"/></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm"/></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/tests-36_passing-00ff88?style=flat-square" alt="Tests"/></a>
  <a href="#"><img src="https://img.shields.io/badge/engine-0_dependencies-00ff88?style=flat-square" alt="Zero deps"/></a>
  <a href="#"><img src="https://img.shields.io/badge/build-passing-00ff88?style=flat-square" alt="Build"/></a>
</p>

---

## What is NEKRIS?

**NEKRIS** transforms a single-player path-building puzzle ("Stretchy Cat") into a competitive multiplayer experience. Guide a neon cat through a grid, collecting items and reaching the goal — but now you're racing against others.

```
  ┌──────────────────────────────────────────┐
  │                                          │
  │    🐱 ━━━━━━━━━┓                         │
  │                ┃   🐟  +5s               │
  │    🛋️          ┃                         │
  │                ┗━━━━━━┓                  │
  │    💧  danger!        ┃   🧶  +50pts     │
  │                       ┃                  │
  │    🌿          🏁 ◄━━━┛                  │
  │                                          │
  └──────────────────────────────────────────┘
```

### Game Modes

| Mode | Description | Status |
|------|-------------|--------|
| **Daily Challenge** | Same seeded puzzle for everyone. Compete on the leaderboard. | **Playable** |
| **Quick Race 1v1** | Real-time matchmaking. Both players solve the same level simultaneously. | Coming Soon |
| **Ranked** | ELO + tiers (Bronze → Master). Climb the ladder. | Coming Soon |

### Core Mechanics

- **Path building** — Extend the cat's path through adjacent cells
- **Backspace** — Click the second-to-last cell to undo
- **Collectibles** — Fish (+5s timer) and Yarn (+50 pts) with expiration timers
- **Water hazard** — Step on water and the level resets
- **Mirror maps** — In 1v1, Player B gets a horizontally flipped version
- **Deterministic seeds** — Every run is reproducible via mulberry32 PRNG

---

## Architecture

```
nekris/
├── packages/
│   └── engine/          # Pure TS game engine (0 dependencies)
│       ├── src/
│       │   ├── gameEngine.ts     # processMove() — pure function, no side effects
│       │   ├── levelGenerator.ts # Seeded level generation
│       │   ├── mirrorMap.ts      # Horizontal flip for 1v1
│       │   ├── scoring.ts        # ELO + tier system
│       │   ├── validation.ts     # Server-side move replay
│       │   ├── prng.ts           # mulberry32 PRNG
│       │   └── protocol.ts       # WebSocket message types
│       └── __tests__/            # 36 tests (vitest)
│
├── apps/
│   └── web/             # Next.js 16 + Tailwind v4
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx              # Lobby (animated menu)
│       │   │   └── play/daily/page.tsx   # Daily Challenge
│       │   ├── components/
│       │   │   ├── game/                 # Grid, Cell, CatHead
│       │   │   └── effects/              # Particles, Countdown, Victory
│       │   └── hooks/                    # useGameEngine, useAudio, useKeyboard
│       └── ...
│
├── docs/plans/          # Design docs & implementation plan
└── pnpm-workspace.yaml
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Pure engine** | `processMove()` returns `GameEffect[]` — no DOM, no audio, no side effects |
| **Deterministic** | Same seed + same moves = same result. Always. |
| **Effect-driven** | Engine emits effects (AUDIO, TIMER_ADD, WIN), React interprets them |
| **Zero dependencies** | Engine package has literally 0 runtime dependencies |
| **Replay-verifiable** | Server can validate any game by replaying moves |

---

## Visual Design

TETRIO-inspired dark theme with neon accents:

| Element | Value |
|---------|-------|
| Background | `#0a0a0a` |
| Surface | `#1a1a2e` |
| Accent | `#00ff88` |
| Danger | `#ff4444` |
| Text | `#e0e0e0` |

### Animations

- **Canvas particle system** — 60 floating particles with glow
- **Staggered grid entrance** — Diagonal wave on level load
- **3-2-1-GO countdown** — Zoom + blur + expanding ring pulse
- **Neon path glow** — Spring-based bounce with drop shadows
- **Cat head blink** — Periodic eye animation
- **Collectible bob** — Floating + warning flash on expiry
- **Victory confetti** — 50-piece confetti + shock ring + flash burst
- **Score spring** — Scale pop on score change
- **Glitch logo** — TETRIO-style skew animation on title
- **Grid container glow** — Breathing border animation

---

## Getting Started

```bash
# Prerequisites: Node.js 18+, pnpm 9+

# Clone
git clone https://github.com/4ndrxxs/Nekris.git
cd Nekris

# Install
pnpm install

# Run engine tests
pnpm --filter @nekris/engine test

# Start dev server
pnpm --filter @nekris/web dev

# Build
pnpm --filter @nekris/web build
```

Visit `http://localhost:3000` and click **Daily Challenge**.

---

## Engine API

```typescript
import {
  createPRNG,
  generateLevel,
  processMove,
  createInitialState,
  mirrorLevel,
  calculateElo,
  getTier,
  replayMoves,
} from '@nekris/engine';

// Generate a deterministic level
const rng = createPRNG(20260226);
const level = generateLevel(1, rng);

// Process a move (pure function)
const state = createInitialState(level);
const result = processMove(state, { x: 1, y: 0 }, level);
// result.effects → [{ type: 'AUDIO', sound: 'stretch' }]

// Mirror for Player B
const mirroredLevel = mirrorLevel(level);

// Validate on server
const { valid, finalScore } = replayMoves(seed, 1, moves);
```

---

## Roadmap

- [x] **Phase 1** — Pure TypeScript engine (36 tests passing)
- [x] **Phase 2** — Next.js web app + Daily Challenge mode
- [x] **Phase 3** — TETRIO-level animations + mobile optimization
- [ ] **Phase 4** — Supabase (auth, leaderboard, profiles)
- [ ] **Phase 5** — PartyKit real-time server (1v1 matchmaking)
- [ ] **Phase 6** — Quick Race mode + opponent minimap
- [ ] **Phase 7** — Ranked system (ELO + tiers)
- [ ] **Phase 8** — Deploy to nekris.online

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Engine | Pure TypeScript | Game logic, 0 deps |
| Frontend | Next.js 16 (Turbopack) | App framework |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Animation | Framer Motion + Canvas | TETRIO-level dynamism |
| Testing | Vitest | 36 engine tests |
| Monorepo | pnpm workspaces | Package management |
| Realtime | PartyKit | 1v1 WebSocket server (planned) |
| Database | Supabase | Auth + leaderboard (planned) |

---

<p align="center">
  <sub>Built with obsessive attention to animation detail.</sub>
</p>
