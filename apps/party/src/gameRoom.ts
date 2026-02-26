import type { Party, PartyKitServer, Connection } from "partykit/server";
import { replayMoves, calculateElo, getTier } from "@nekris/engine";
import type { Point, TimedMove } from "@nekris/engine";

// ─── Types ──────────────────────────────────────────────────────────
type RoomPhase = "WAITING" | "COUNTDOWN" | "PLAYING" | "FINISHED";

interface Player {
  connId: string;
  userId: string;
  name: string;
  elo: number;
  ready: boolean;
  moves: TimedMove[];
  finalScore: number | null;
  finishedAt: number | null;
  lastMoveProgress: number; // 0-1 path completion for minimap
}

interface RoomState {
  phase: RoomPhase;
  seed: number;
  levelIndex: number;
  players: Map<string, Player>;
  startsAt: number;
  countdownTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  createdAt: number;
}

interface ReadyMsg { type: "READY" }
interface MoveMsg { type: "MOVE"; point: Point; t: number }
interface FinishMsg { type: "FINISH"; moves: TimedMove[]; finalScore: number }

type IncomingMsg =
  | ReadyMsg
  | MoveMsg
  | FinishMsg
  | { type: "JOIN"; userId: string; name: string; elo: number; seed: number };

// ─── Constants ──────────────────────────────────────────────────────
const COUNTDOWN_SECONDS = 3;
const DISCONNECT_TIMEOUT_MS = 30_000;
const ROOM_TTL_MS = 10 * 60 * 1000; // 10 min max room lifetime

// ─── Game Room Party ────────────────────────────────────────────────
const rooms = new Map<string, RoomState>();

function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId);
}

function createRoom(roomId: string, seed: number): RoomState {
  const state: RoomState = {
    phase: "WAITING",
    seed,
    levelIndex: 0,
    players: new Map(),
    startsAt: 0,
    countdownTimer: null,
    disconnectTimers: new Map(),
    createdAt: Date.now(),
  };
  rooms.set(roomId, state);
  return state;
}

export default {
  onConnect(conn: Connection, room: Party) {
    // Connection established — wait for JOIN message
  },

  onMessage(message: string, conn: Connection, room: Party) {
    let msg: IncomingMsg;
    try {
      msg = JSON.parse(message as string);
    } catch {
      conn.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
      return;
    }

    const roomId = room.id;

    switch (msg.type) {
      case "JOIN":
        handleJoin(msg, conn, room, roomId);
        break;
      case "READY":
        handleReady(conn, room, roomId);
        break;
      case "MOVE":
        handleMove(msg, conn, room, roomId);
        break;
      case "FINISH":
        handleFinish(msg, conn, room, roomId);
        break;
    }
  },

  onClose(conn: Connection, room: Party) {
    const state = getRoom(room.id);
    if (!state) return;

    const player = state.players.get(conn.id);
    if (!player) return;

    if (state.phase === "PLAYING") {
      // Give opponent a chance — set disconnect timer
      const timer = setTimeout(() => {
        // If still disconnected, opponent wins
        if (state.phase === "PLAYING") {
          finishMatch(state, room, getOpponent(state, conn.id)?.connId);
        }
      }, DISCONNECT_TIMEOUT_MS);

      state.disconnectTimers.set(conn.id, timer);

      // Notify opponent
      broadcastToOthers(
        conn.id,
        { type: "OPPONENT_DISCONNECT", timeout: DISCONNECT_TIMEOUT_MS / 1000 },
        state,
        room,
      );
    } else if (state.phase === "WAITING" || state.phase === "COUNTDOWN") {
      // Cancel if someone leaves before game starts
      state.players.delete(conn.id);
      if (state.countdownTimer) {
        clearTimeout(state.countdownTimer);
        state.countdownTimer = null;
      }
      broadcastToAll({ type: "ERROR", message: "Opponent left. Returning to queue." }, state, room);
      cleanupRoom(room.id);
    }
  },
} satisfies PartyKitServer;

// ─── Handlers ──────────────────────────────────────────────────────
function handleJoin(
  msg: { userId: string; name: string; elo: number; seed: number },
  conn: Connection,
  room: Party,
  roomId: string,
) {
  let state = getRoom(roomId);
  if (!state) {
    state = createRoom(roomId, msg.seed);
  }

  // Check for reconnection
  const existingDisconnect = state.disconnectTimers.get(conn.id);
  if (existingDisconnect) {
    clearTimeout(existingDisconnect);
    state.disconnectTimers.delete(conn.id);
  }

  if (state.players.size >= 2 && !state.players.has(conn.id)) {
    conn.send(JSON.stringify({ type: "ERROR", message: "Room is full" }));
    return;
  }

  state.players.set(conn.id, {
    connId: conn.id,
    userId: msg.userId,
    name: msg.name,
    elo: msg.elo,
    ready: false,
    moves: [],
    finalScore: null,
    finishedAt: null,
    lastMoveProgress: 0,
  });

  // Send GAME_INIT to the joining player
  conn.send(
    JSON.stringify({
      type: "GAME_INIT",
      seed: state.seed,
      levelIndex: state.levelIndex,
      startsAt: 0, // will be set on countdown
      playerCount: state.players.size,
    }),
  );

  // If both players joined, prompt READY
  if (state.players.size === 2) {
    broadcastToAll({ type: "WAITING_FOR_READY" }, state, room);
  }
}

function handleReady(conn: Connection, room: Party, roomId: string) {
  const state = getRoom(roomId);
  if (!state || state.phase !== "WAITING") return;

  const player = state.players.get(conn.id);
  if (!player) return;

  player.ready = true;

  // Check if both ready
  const allReady = [...state.players.values()].every((p) => p.ready);
  if (allReady && state.players.size === 2) {
    startCountdown(state, room);
  }
}

function handleMove(msg: MoveMsg, conn: Connection, room: Party, roomId: string) {
  const state = getRoom(roomId);
  if (!state || state.phase !== "PLAYING") return;

  const player = state.players.get(conn.id);
  if (!player) return;

  // Record the move
  player.moves.push({ point: msg.point, t: msg.t });

  // Estimate progress (moves / expected moves)
  player.lastMoveProgress = Math.min(player.moves.length / 50, 1);

  // Relay to opponent (with progress for minimap)
  broadcastToOthers(
    conn.id,
    {
      type: "OPPONENT_MOVE",
      point: msg.point,
      t: msg.t,
      score: 0, // client calculates
      progress: player.lastMoveProgress,
    },
    state,
    room,
  );
}

function handleFinish(msg: FinishMsg, conn: Connection, room: Party, roomId: string) {
  const state = getRoom(roomId);
  if (!state || state.phase !== "PLAYING") return;

  const player = state.players.get(conn.id);
  if (!player || player.finalScore !== null) return;

  // Server-side verification via move replay
  const verification = replayMoves(state.seed, state.levelIndex, msg.moves);

  if (!verification.valid) {
    conn.send(
      JSON.stringify({ type: "ERROR", message: "Move verification failed — score rejected" }),
    );
    player.finalScore = 0;
  } else {
    player.finalScore = verification.finalScore;
  }

  player.finishedAt = Date.now();
  player.moves = msg.moves;

  // Notify opponent
  broadcastToOthers(
    conn.id,
    {
      type: "OPPONENT_FINISH",
      score: player.finalScore,
      time: (player.finishedAt - state.startsAt) / 1000,
    },
    state,
    room,
  );

  // Check if both finished
  const allFinished = [...state.players.values()].every((p) => p.finalScore !== null);
  if (allFinished) {
    finishMatch(state, room);
  }
}

// ─── Game Flow ─────────────────────────────────────────────────────
function startCountdown(state: RoomState, room: Party) {
  state.phase = "COUNTDOWN";
  let remaining = COUNTDOWN_SECONDS;

  const tick = () => {
    if (remaining > 0) {
      broadcastToAll({ type: "COUNTDOWN", seconds: remaining }, state, room);
      remaining--;
      state.countdownTimer = setTimeout(tick, 1000);
    } else {
      state.phase = "PLAYING";
      state.startsAt = Date.now();
      broadcastToAll({ type: "GAME_START" }, state, room);

      // Auto-finish after room TTL
      state.countdownTimer = setTimeout(() => {
        if (state.phase === "PLAYING") {
          finishMatch(state, room);
        }
      }, ROOM_TTL_MS);
    }
  };

  tick();
}

function finishMatch(state: RoomState, room: Party, forcedWinnerId?: string) {
  if (state.phase === "FINISHED") return;
  state.phase = "FINISHED";

  if (state.countdownTimer) {
    clearTimeout(state.countdownTimer);
  }

  const players = [...state.players.values()];
  if (players.length !== 2) {
    cleanupRoom(room.id);
    return;
  }

  const [a, b] = players;

  // Determine winner
  let winnerId: string;
  if (forcedWinnerId) {
    winnerId = forcedWinnerId;
  } else {
    const aScore = a.finalScore ?? 0;
    const bScore = b.finalScore ?? 0;
    if (aScore > bScore) winnerId = a.connId;
    else if (bScore > aScore) winnerId = b.connId;
    else {
      // Tiebreaker: who finished first
      const aTime = a.finishedAt ?? Infinity;
      const bTime = b.finishedAt ?? Infinity;
      winnerId = aTime <= bTime ? a.connId : b.connId;
    }
  }

  const aWon = winnerId === a.connId;
  const elo = calculateElo(a.elo, b.elo, aWon);

  // Send results to player A
  const connA = room.getConnection(a.connId);
  if (connA) {
    connA.send(
      JSON.stringify({
        type: "MATCH_RESULT",
        winner: aWon ? a.userId : b.userId,
        myElo: elo.newA,
        eloChange: aWon ? elo.change : -elo.change,
        myScore: a.finalScore ?? 0,
        opScore: b.finalScore ?? 0,
        opName: b.name,
        opElo: elo.newB,
        myTier: getTier(elo.newA),
      }),
    );
  }

  // Send results to player B
  const connB = room.getConnection(b.connId);
  if (connB) {
    connB.send(
      JSON.stringify({
        type: "MATCH_RESULT",
        winner: aWon ? a.userId : b.userId,
        myElo: elo.newB,
        eloChange: aWon ? -elo.change : elo.change,
        myScore: b.finalScore ?? 0,
        opScore: a.finalScore ?? 0,
        opName: a.name,
        opElo: elo.newA,
        myTier: getTier(elo.newB),
      }),
    );
  }

  // Cleanup after a delay to let clients read the result
  setTimeout(() => cleanupRoom(room.id), 5000);
}

// ─── Utilities ─────────────────────────────────────────────────────
function getOpponent(state: RoomState, connId: string): Player | undefined {
  for (const [id, player] of state.players) {
    if (id !== connId) return player;
  }
  return undefined;
}

function broadcastToAll(msg: object, state: RoomState, room: Party) {
  const data = JSON.stringify(msg);
  for (const [connId] of state.players) {
    const conn = room.getConnection(connId);
    if (conn) conn.send(data);
  }
}

function broadcastToOthers(senderConnId: string, msg: object, state: RoomState, room: Party) {
  const data = JSON.stringify(msg);
  for (const [connId] of state.players) {
    if (connId !== senderConnId) {
      const conn = room.getConnection(connId);
      if (conn) conn.send(data);
    }
  }
}

function cleanupRoom(roomId: string) {
  const state = rooms.get(roomId);
  if (state) {
    for (const timer of state.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    if (state.countdownTimer) {
      clearTimeout(state.countdownTimer);
    }
    rooms.delete(roomId);
  }
}
