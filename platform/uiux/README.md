# uradhura — production-oriented SaaS UI starter

This is an original React + TypeScript/Vite UI foundation for the live social + gaming platform described in the supplied BRD/SRS and reference videos/screenshots.

## Important
This project intentionally contains **no demo/seed/mock business data**.

The UI reads through `src/lib/api.ts`. Until you connect the real services, it will show a truthful connection/empty state.

## Build order
1. Connect authentication + RBAC.
2. Connect real GameAdmin configuration APIs.
3. Connect PostgreSQL-backed game/config services.
4. Connect WebSocket realtime events.
5. Connect authoritative wallet/ledger APIs.
6. Implement server-authoritative game engines.
7. Connect the six game frontends.
8. Add live/voice/WebRTC, social, gifts, agencies, rankings, tasks and moderation.
9. Add observability, security, load testing and UAT.

## Games
- Greedy Monkey
- Greedy Lion
- Teen Patti
- Food Wheel / Package Betting
- Three-Player Card Game
- Slot / Multiplier

Only the first two game-specific shells are specialized in this starter; the generic shell is reusable for the remaining games. Extend each into its own independent module.

## Assets
`public/assets/` contains newly created original SVG assets for the uradhura visual system. They are intentionally different from the supplied reference application's branding and layouts.

## Realtime contract
See `src/lib/realtime.ts`. The browser is never authoritative for:
- balance
- bet acceptance
- result
- payout
- settlement
- RNG/card dealing/game outcome

Those belong to the backend/game engine.

## Run
npm install
npm run dev
