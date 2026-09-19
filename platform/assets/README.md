# URADHURA Asset Catalog

Original artwork for the Uradhura platform — **generated, not hand-copied**:
everything in this tree is derived from the brand palette in
`platform/scripts/generate-asset-catalog.mjs`. Nothing is imported from
any third-party product.

## Regenerate

```bash
node platform/scripts/generate-asset-catalog.mjs
```

This writes:

| Output | Purpose |
|---|---|
| `platform/assets/<category>/<key>.svg` | Vector source artwork |
| `platform/assets/catalog.json` | Machine-readable registry index (used by `prisma/seed-assets.ts`) |
| `platform/apps/player/src/lib/assets/bundledSVG.ts` | SVG strings bundled inside the player APK |

## Brand palette

deep navy (`#050914`–`#1f3357`), black, electric blue `#2e6bff`,
violet `#7c3aed`, cyan `#22d3ee`, premium gradients, glass surfaces,
soft glow.

## Category map

| Category | Contents |
|---|---|
| `bg.home / room / ranking / wallet / games / party / live` | Full-bleed gradient environments (SVG, offline-capable) |
| `frame.avatar / profile / vip / ranking / level` | Overlay frames |
| `logo` | App icon, emblem, splash, wordmark |
| `icons.navigation` | Bottom-tab icons + `.selected` variants (Home, Live, Party, Games, Wallet, Messages, Profile) |
| `icons.home / profile / audio-seat / invite / crypto / gift` | Screen-specific icons |
| `avatars.default` | Neutral account silhouettes (never real people) |
| `gifts.basic / premium / luxury` | Original gift glyphs (heart, rose, star, candy, crown, rocket, diamond, world) |
| `invite` | Share destinations (WhatsApp, Telegram, X, Facebook, Instagram, link) |
| `tasks / rewards / badges / vip / events / notifications` | Progress & status art |
| `games.teen-patti.table / cards / chips / seats / effects` | Teen Patti playset |
| `wallet / crypto` | Wallet card + BTC/ETH/USDT marks + **COMING SOON** promos |
| `animations / audio / fonts` | Remote-updatable Lottie / audio / font drops |

## Rules

1. Icons are SVG (crisp at any DPI, small). Raster art (photos, WebP/AVIF)
   is uploaded through the registry when needed — never checked into the APK
   unless it ships in the core bundle.
2. No fake user photos, no fake balances/transactions, no fake rankings.
   Default avatars are abstract silhouettes.
3. Crypto assets are UI-only marks with explicit **COMING SOON** states —
   there is no blockchain integration in V1.
4. Gifts, frames, badges, event graphics, room backgrounds and promotional
   art are seeded into the registry with `isBundled: true` so a Super Admin
   can publish remote replacements **without an APK release**.