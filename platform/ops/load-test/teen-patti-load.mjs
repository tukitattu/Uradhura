// ============================================================
// TEEN PATTI CONCURRENCY LOAD TEST
//
// Simulates N concurrent players connecting to the /teen-patti
// Socket.IO namespace, sitting at tables, and issuing actions,
// so we can observe CPU/DB/connection behaviour under load.
//
// Usage:
//   npm install        # once (pulls socket.io-client)
//
//   # Seed players first (player accounts + chips). For every
//   # configured player index i, we log in as:
//   #   username = PLAYER_PREFIX + i, password = PASSWORD
//   # Tables must exist — create them via the admin panel first,
//   # or set ADMIN_TOKEN to auto-create TABLE_COUNT tables.
//
//   node teen-patti-load.mjs             # defaults below
//   PLAYERS=2000 RAMP_UP_S=30 DURATION_S=60 node teen-patti-load.mjs
//
// Environment:
//   API_URL       base url incl. /api/v1  (default http://localhost:4002/api/v1)
//   PLAYERS       total simulated players (default 100)
//   PLAYER_PREFIX username prefix        (default "load")
//   PASSWORD      shared player password (default "LoadTest123!")
//   START_INDEX   first player index     (default 1)
//   TABLE_COUNT   tables to seat across  (default 10)
//   ADMIN_TOKEN   super-admin JWT — if set, auto-created tables
//   RAMP_UP_S     seconds to spread connects over (default 10)
//   DURATION_S    total run time before shutdown (default 60)
//
// Metrics printed every 5 s: connected, errors, actions sent,
// tp_state pkt/s, avg latency of last window.
// ============================================================

import io from "socket.io-client";
import axios from "axios";

const ctx = {
  apiUrl: process.env.API_URL || "http://localhost:4002/api/v1",
  players: parseInt(process.env.PLAYERS || "100", 10),
  prefix: process.env.PLAYER_PREFIX || "load",
  password: process.env.PASSWORD || "LoadTest123!",
  startIndex: parseInt(process.env.START_INDEX || "1", 10),
  tableCount: parseInt(process.env.TABLE_COUNT || "10", 10),
  adminToken: process.env.ADMIN_TOKEN || "",
  rampUpS: parseFloat(process.env.RAMP_UP_S || "10"),
  durationS: parseFloat(process.env.DURATION_S || "60"),
};

const state = {
  connected: 0,
  joinErrors: 0,
  actionsSent: 0,
  packets: 0,
  actionPkts: 0,
  errors: 0,
};

const socks = [];
let tables = [];

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function ensureTables() {
  // Prefer listing existing open tables.
  try {
    const { data } = await axios.get(`${ctx.apiUrl}/teen-patti/tables`);
    tables = (data.data ?? data ?? []).slice(0, ctx.tableCount);
  } catch {
    tables = [];
  }

  const need = ctx.tableCount - tables.length;
  if (need > 0 && ctx.adminToken) {
    for (let i = 0; i < need; i++) {
      const { data } = await axios.post(
        `${ctx.apiUrl}/admin/teen-patti/tables`,
        { title: `load-test-${i}`, botFill: true },
        { headers: { Authorization: `Bearer ${ctx.adminToken}` } },
      );
      const t = data.data ?? data;
      tables.push({ id: t.id, tableCode: t.tableCode });
    }
  }

  if (tables.length === 0) {
    log("WARN: no tables available. Create tables via the admin panel (Teen Patti > New Table, botFill on) or pass ADMIN_TOKEN.");
  }
  log(`tables ready: ${tables.length}`);
}

async function loginPlayer(username) {
  const { data } = await axios.post(`${ctx.apiUrl}/auth/player/login`, {
    identifier: username,
    password: ctx.password,
  });
  return data;
}

async function spawnPlayer(i) {
  const username = `${ctx.prefix}${ ctx.startIndex + i }`;
  const table = tables[i % Math.max(1, tables.length)];

  try {
    const auth = await loginPlayer(username);

    // Sit at the REST layer so chips are escrowed; then connect the socket
    // for live state + actions.
    try {
      await axios.post(
        `${ctx.apiUrl}/teen-patti/tables/${table.id}/sit`,
        { buyIn: 1000 },
        { headers: { Authorization: `Bearer ${auth.accessToken}` } },
      );
    } catch (e) {
      // Already seated / table full / insufficient funds — still connect.
    }

    const s = io(`${ctx.apiUrl.replace(/\/api\/v1.*$/, "")}/teen-patti`, {
      transports: ["websocket"],
      auth: { token: auth.accessToken },
      reconnection: false,
    });
    socks.push(s);

    let lastAction = 0;

    s.on("connect", () => {
      state.connected++;
      s.emit("join_table", { tableId: table.id });
    });

    s.on("tp_state", (msg) => {
      state.packets++;
      const st = msg?.state;
      const mySeat = st?.seats?.find((seat) => seat.name === username || seat.playerId?.startsWith("player-") === false) ??
        st?.seats?.find((seat) => seat.isBot === false && seat.seatNo === st?.turn);
      if (st && st.turn != null && mySeat && st.turn === mySeat.seatNo) {
        const now = Date.now();
        if (now - lastAction > 2500) {
          lastAction = now;
          s.emit("tp_action", { tableId: table.id, kind: Math.random() < 0.2 ? "fold" : Math.random() < 0.5 ? "see" : "chaal" });
          state.actionsSent++;
        }
      }
    });

    s.on("tp_event", () => {
      state.actionPkts++;
      state.packets++;
    });

    s.on("tp_result", () => state.packets++);
    s.on("error", () => state.errors++);
    s.on("connect_error", () => state.joinErrors++);
  } catch (e) {
    state.errors++;
    log(`player ${username} failed to spawn: ${e.response?.data?.message ?? e.message}`);
  }
}

function report(intervalMs = 5000) {
  setInterval(() => {
    log(
      `connected=${state.connected}/${ctx.players} actions=${state.actionsSent} ` +
      `pkt/s=${Math.round(((state.packets + state.actionPkts) / (intervalMs / 1000)) * 100) / 100}...`,
    );
    state.packets = 0;
    state.actionPkts = 0;
  }, intervalMs);
}

async function main() {
  log(`config: players=${ctx.players} tables=${ctx.tableCount} ramp=${ctx.rampUpS}s duration=${ctx.durationS}s api=${ctx.apiUrl}`);
  await ensureTables();

  if (tables.length === 0) {
    log("aborting: no tables");
    process.exit(1);
  }

  report();

  const rampMs = Math.max(1, (ctx.rampUpS * 1000) / ctx.players);
  for (let i = 0; i < ctx.players; i++) {
    void spawnPlayer(i);
    await new Promise((r) => setTimeout(r, rampMs));
  }

  const stoppedAt = Date.now() + ctx.durationS * 1000;
  await new Promise((resolve) => {
    const remaining = () => Math.max(0, stoppedAt - Date.now());
    const tick = () => {
      if (remaining() <= 0) return resolve();
      setTimeout(tick, Math.min(1000, remaining()));
    };
    setTimeout(tick, Math.min(1000, remaining()));
  });

  log(`drain done. closing ${socks.length} sockets`);
  for (const s of socks) {
    try {
      s.disconnect();
    } catch {}
  }
  log("load test complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});