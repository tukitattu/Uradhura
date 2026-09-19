# Concurrency Load Test

End-to-end harness for validating the live layer under "1 lac concurrent players".

## What it does

Simulates `PLAYERS` concurrent players against the **Teen Patti** realtime flow:

1. REST login (`POST /auth/player/login`) per player
2. `POST /teen-patti/tables/:id/sit` (escrow buy-in)
3. Connect to `/teen-patti` Socket.IO namespace (websocket only)
4. `join_table`, then auto-act (`chaal` / `see` / `fold`) whenever a seat becomes
   their turn
5. Reports connection count, actions sent and packet rates every 5 s

## Prereqs

- API running (dev/docker). DB seeded with `PLAYERS` player accounts:
  - username = `${PLAYER_PREFIX}${index}`, password = `PASSWORD`
  - each with enough chips to buy in (default buyIn 1000)
- Tables must exist. Either create them in the admin panel (Teen Patti → New
  Table, bot fill ON) or pass `ADMIN_TOKEN` and the harness auto-creates
  `TABLE_COUNT` tables:
  ```
  node teen-patti-load.mjs
  PLAYERS=2000 RAMP_UP_S=30 DURATION_S=120 ADMIN_TOKEN=eyJ... node teen-patti-load.mjs
  ```

## Env vars

| Var | Default | Meaning |
| --- | --- | --- |
| `API_URL` | `http://localhost:4002/api/v1` | API base |
| `PLAYERS` | `100` | total simulated players |
| `PLAYER_PREFIX` | `load` | username prefix (`load1`, `load2`, ...) |
| `PASSWORD` | `LoadTest123!` | shared password |
| `START_INDEX` | `1` | first player index |
| `TABLE_COUNT` | `10` | tables to seat across |
| `ADMIN_TOKEN` | *(empty)* | super-admin JWT → auto-create missing tables |
| `RAMP_UP_S` | `10` | spread connects over N seconds |
| `DURATION_S` | `60` | run length |

## Reading the results

While the harness runs, watch on the server side:

- **API process**: CPU / memory (`top`), and Prisma query rate
  (`pg_stat_statements` or `pg_stat_activity` `backend_xmin` growth).
- **nginx logs**: confirm `worker_connections` is not the binding limit, and no
  `429` (rate limiter) or `499` open connections being dropped.
- **Expected signatures after the scale work**:
  - No DB activity for idle/open tables between hands (scheduler only touches
    armed tables with live hands).
  - Constant per-action DB writes (settle transaction) but no per-action **read
    amplification** (states are broadcast from in-memory runtime).
  - `tp_state` rate should stay flat per player regardless of table count.

## Beyond one box

Above ~15–20k sockets per process, `worker_connections 8192` and a single API
replica become the limit. Horizontal scale-out then requires the documented
follow-ups:

- Socket.IO **Redis adapter** + sticky sessions (or Redis pub/sub for state)
- Extract the in-memory table runtimes behind an external store / stream
- Multiplex `sendPersonalSettlements` already O(bets) per round (fine across
  replicas since rooms are namespace-local)

See `platform/docs` / the "Scaling follow-ups" section in the code comments if
you take this path.