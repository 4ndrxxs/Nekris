import type { Party, PartyKitServer, Connection } from "partykit/server";
import { getTier } from "@nekris/engine";

// ─── Types ──────────────────────────────────────────────────────────
interface QueueEntry {
  connId: string;
  userId: string;
  name: string;
  elo: number;
  joinedAt: number;
}

interface QueueJoinMsg {
  type: "QUEUE_JOIN";
  mode: "quick" | "ranked";
  userId: string;
  name: string;
  elo: number;
}

interface QueueLeaveMsg {
  type: "QUEUE_LEAVE";
}

type IncomingMsg = QueueJoinMsg | QueueLeaveMsg;

// ─── Constants ──────────────────────────────────────────────────────
const MATCH_TICK_MS = 1500;
const INITIAL_ELO_RANGE = 200;
const ELO_RANGE_EXPANSION = 100; // every tick, expand acceptable range
const MAX_ELO_RANGE = 800;

// ─── Matchmaking Party ─────────────────────────────────────────────
export default {
  onConnect(conn: Connection, room: Party) {
    conn.send(JSON.stringify({ type: "QUEUE_STATUS", position: 0 }));
  },

  onMessage(message: string, conn: Connection, room: Party) {
    let msg: IncomingMsg;
    try {
      msg = JSON.parse(message as string);
    } catch {
      conn.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON" }));
      return;
    }

    const queue = getQueue(room);

    switch (msg.type) {
      case "QUEUE_JOIN": {
        // Remove any existing entry for this connection
        removeFromQueue(queue, conn.id);

        queue.push({
          connId: conn.id,
          userId: msg.userId,
          name: msg.name,
          elo: msg.elo,
          joinedAt: Date.now(),
        });

        broadcastQueuePositions(queue, room);
        tryMatchmaking(queue, room);
        break;
      }

      case "QUEUE_LEAVE": {
        removeFromQueue(queue, conn.id);
        broadcastQueuePositions(queue, room);
        break;
      }
    }
  },

  onClose(conn: Connection, room: Party) {
    const queue = getQueue(room);
    removeFromQueue(queue, conn.id);
    broadcastQueuePositions(queue, room);
  },
} satisfies PartyKitServer;

// ─── Queue Storage (in-memory per party instance) ───────────────────
const queues = new Map<string, QueueEntry[]>();

function getQueue(room: Party): QueueEntry[] {
  if (!queues.has(room.id)) queues.set(room.id, []);
  return queues.get(room.id)!;
}

function removeFromQueue(queue: QueueEntry[], connId: string) {
  const idx = queue.findIndex((e) => e.connId === connId);
  if (idx !== -1) queue.splice(idx, 1);
}

// ─── Broadcasting ──────────────────────────────────────────────────
function broadcastQueuePositions(queue: QueueEntry[], room: Party) {
  for (let i = 0; i < queue.length; i++) {
    const conn = room.getConnection(queue[i].connId);
    if (conn) {
      conn.send(JSON.stringify({ type: "QUEUE_STATUS", position: i + 1 }));
    }
  }
}

// ─── Matching Logic ────────────────────────────────────────────────
function tryMatchmaking(queue: QueueEntry[], room: Party) {
  if (queue.length < 2) return;

  const now = Date.now();
  const matched = new Set<string>();

  // Sort by join time (FIFO priority)
  const sorted = [...queue].sort((a, b) => a.joinedAt - b.joinedAt);

  for (let i = 0; i < sorted.length; i++) {
    if (matched.has(sorted[i].connId)) continue;

    const a = sorted[i];
    const waitTime = now - a.joinedAt;
    const eloRange = Math.min(
      INITIAL_ELO_RANGE + Math.floor(waitTime / MATCH_TICK_MS) * ELO_RANGE_EXPANSION,
      MAX_ELO_RANGE,
    );

    for (let j = i + 1; j < sorted.length; j++) {
      if (matched.has(sorted[j].connId)) continue;

      const b = sorted[j];
      const eloDiff = Math.abs(a.elo - b.elo);

      if (eloDiff <= eloRange) {
        matched.add(a.connId);
        matched.add(b.connId);

        // Generate a unique room ID
        const roomId = `race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const seed = Date.now() ^ (Math.random() * 0xffffffff) >>> 0;

        // Notify both players
        const connA = room.getConnection(a.connId);
        const connB = room.getConnection(b.connId);

        if (connA) {
          connA.send(
            JSON.stringify({
              type: "MATCH_FOUND",
              roomId,
              seed,
              opponent: { name: b.name, elo: b.elo, tier: getTier(b.elo) },
            }),
          );
        }

        if (connB) {
          connB.send(
            JSON.stringify({
              type: "MATCH_FOUND",
              roomId,
              seed,
              opponent: { name: a.name, elo: a.elo, tier: getTier(a.elo) },
            }),
          );
        }

        break;
      }
    }
  }

  // Remove matched players from queue
  for (const connId of matched) {
    removeFromQueue(queue, connId);
  }
}
