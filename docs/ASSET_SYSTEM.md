# URADHURA Asset System

Everything a Super Admin replaces ships to players **without an APK release**.
Core navigation UI is bundled in the client so it renders instantly and offline;
gifts, frames, badges, event art, room backgrounds and promotions are
remote-managed through the registry.

```
                        ┌──────────────────────────────────────────────┐
                        │  platform/scripts/generate-asset-catalog.mjs │  original artwork
                        └───────────────┬──────────────────────────────┘
                                        │ writes
              ┌─────────────────────────┼──────────────────────────────┐
              ▼                         ▼                              ▼
   platform/assets/*.svg     catalog.json                bundledSVG.ts (player)
        │                        │                              │
        │                  prisma/seed-assets.ts               │  compiled into APK
        ▼                        │                              │
   storage/assets/        ┌──────▼───────┐                      │
   (served /assets)       │  Asset table │   super admin edits   │
        │                 └──────┬───────┘   upload / replace    │
        ▼                        ▼                               │
   GET /assets/manifest ◄── published+enabled+in-window           │
        │                        │ e.g. gifts.basic.heart v1     │
        ▼                        ▼                               ▼
   Player AssetProvider  ──►  cache (AsyncStorage)            bundled svg
        │                        │                        BranchAsset render
        │   remote.version > 1 ? │                              │
        └────────────────────────┴──────────────────────────────┘
                    winner renders: remote override OR bundled
```

## Pipeline

1. `node platform/scripts/generate-asset-catalog.mjs`
   Regenerates the original art (SVG), `catalog.json`, and `bundledSVG.ts`.
   Catalog assets start at **version 1** and are published+enabled by the seed.

2. `npm --prefix platform/apps/api run seed:assets`
   Idempotent upsert by key. If catalog art changed, it bumps the version,
   writes the new file, prunes old revisions, and re-publishes. No fake data —
   only real bundled artwork is registered.

3. Super Admin flow (`/assets` in the admin panel)
   - **Upload** a file onto a draft record → path `{category}/{key}-v{version}.{ext}`.
   - **Publish** → appears in the public manifest.
   - **Replace** a published file → version bumps (e.g. v1 → v2). The old
     revision file is pruned; the manifest has the new URL.
   - **Edit** metadata: name, description, category, target screen, sort order,
     scope (`game:`, `room:`, `event:`), visibility, start/end window,
     localization JSON, bundled flag.
   - **Lifecycle**: publish / enable / disable / archive / restore / hard delete,
     plus bulk actions. Disabled = hidden from manifest, file kept.
     Archived = hidden + pending delete. Delete removes the row and the file.

## Public manifest — `GET /api/v1/assets/manifest`

Response contains `version` (sha1 of the sorted payload) and only
**published + enabled + in-window** assets. Clients never see drafts.

## Player client policy (`apps/player/src/lib/assets`)

| File | Role |
|---|---|
| `bundledSVG.ts` | Generated SVG strings compiled into the APK |
| `registry.ts` | `resolveAsset()` priority: remote override wins when it exists and is newer than the bundle (`version > 1` and bundled seeds start at v1); otherwise bundled SVG. Raster overrides render as `Image`. |
| `manifest.ts` | Fetch + AsyncStorage cache, 6h refresh window, staleness check |
| `AssetProvider.tsx` | Loads cached manifest instantly, refreshes in background, exposes `refresh()` for pull-to-refresh |
| `BrandAsset.tsx` | `<BrandAsset assetKey="icons.navigation.home">` — SVG or raster, with remote-SVG fetch fallback |

Versioned URLs (`-v3.svg`) are served `Cache-Control: public, max-age=2592000, immutable`,
so clients cache forever and invalidation happens by URL change. External
override URLs not in that form get `?v={version}` appended instead.

## Formats

- Icons / frames / badges / backgrounds: **SVG** (crisp, tiny, bundled or remote).
- Raster media (photos, promo art): **WebP / AVIF / PNG** via upload; the
  registry stores MIME/format/dimensions/checksum.
- Animation: **Lottie JSON** under `animations` (remote-updatable).
- Audio: **mp3/wav/ogg** under `audio`. Fonts under `fonts`.

Allowed upload extensions and the 20 MB limit are enforced in
`asset.constants.ts`.

## Brand

Deep navy/black, electric blue `#2e6bff`, violet `#7c3aed`, cyan `#22d3ee` —
all gradients defined once in the generator so every asset stays on-palette.
All artwork is original to Uradhura.

## Key semantics

- Identity + file path source of truth is `Asset.key` (stable, unique).
- `isBundled` means a seed version ships inside the APK; remote still overrides.
- `localization` is a JSON map (e.g. `{"en": {"caption": "Home"}}`).
- Timestamps `startsAt`/`endsAt` gate in-window publishing.