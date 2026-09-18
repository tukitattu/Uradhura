// ============================================================
// SEED — REGISTER THE ORIGINAL URADHURA ASSET CATALOG
// Idempotent. Registers every entry of platform/assets/catalog.json
// in the Asset registry as a published, enabled, public asset, and
// copies its file into the storage root so the versioned URL is
// served by the API. Re-run any time:
//   npx prisma db seed --seed ts-node prisma/seed-assets.ts
// Only REAL bundled artwork is registered — never fake data.
// ============================================================

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

const prisma = new PrismaClient();

const ROOT = join(__dirname, '..', '..', '..'); // platform/
const CATALOG_PATH = join(ROOT, 'assets', 'catalog.json');
const STORAGE_ROOT = process.env.ASSET_STORAGE_PATH || './storage/assets';
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'http://localhost:4002').replace(/\/+$/, '');
const ASSET_PUBLIC_ROOT = (process.env.ASSET_PUBLIC_ROOT || '/assets').replace(/^\/+/, '');

function sanitizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}
function sanitizeCategory(cat: string) {
  return cat.replace(/[^a-zA-Z0-9.-]/g, '-');
}
function readDimensions(svg: string): { width: number | null; height: number | null } {
  const w = svg.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
  const h = svg.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  if (w && h) {
    const width = Number(w[1]);
    const height = Number(h[1]);
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
  }
  const vb = svg.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/i);
  if (vb) {
    const p = vb[1].split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every((n) => Number.isFinite(n))) return { width: p[2], height: p[3] };
  }
  return { width: null, height: null };
}

async function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error('catalog.json not found — run: node platform/scripts/generate-asset-catalog.mjs');
    process.exit(1);
  }
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
  const now = new Date();

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of catalog.assets) {
    const svgPath = join(ROOT, 'assets', `${item.key.replace(/\./g, '/')}.svg`);
    if (!existsSync(svgPath)) {
      console.warn(`[seed-assets] missing file for key ${item.key} — skipping`);
      continue;
    }
    const svg = readFileSync(svgPath, 'utf8');
    const checksum = createHash('sha256').update(svg).digest('hex');
    const { width, height } = readDimensions(svg);
    const fileSize = Buffer.byteLength(svg);

    const existing = await prisma.asset.findUnique({ where: { key: item.key } });
    const version = existing ? existing.version : 1;

    const safeCategory = sanitizeCategory(item.category);
    const safeKey = sanitizeKey(item.key);
    const relativeFile = `${safeCategory}/${safeKey}-v${version}.svg`;
    const diskFile = join(STORAGE_ROOT, relativeFile);
    const needWrite = !existsSync(diskFile) || createHash('sha256').update(readFileSync(diskFile)).digest('hex') !== checksum;

    if (needWrite) {
      mkdirSync(dirname(diskFile), { recursive: true });
      writeFileSync(diskFile, svg, 'utf8');
      // cleanup old revisions of the same resource (keep current)
      const dir = dirname(diskFile);
      if (existsSync(dir)) {
        for (const f of readdirSync(dir)) {
          if (f.startsWith(`${safeKey}-v`) && f !== `${safeKey}-v${version}.svg` && f.endsWith('.svg')) {
            rmSync(join(dir, f), { force: true });
          }
        }
      }
    }

    const url = `${PUBLIC_API_URL}/${ASSET_PUBLIC_ROOT}/${relativeFile}`;

    if (!existing) {
      await prisma.asset.create({
        data: {
          key: item.key,
          name: item.name,
          description: `Original URADHURA artwork (${item.category})`,
          category: item.category,
          type: 'image/svg+xml',
          format: 'svg',
          extension: 'svg',
          url,
          thumbnailUrl: url,
          version,
          status: 'published',
          isEnabled: true,
          isBundled: item.isBundled ?? true,
          sortOrder: item.sortOrder ?? 0,
          target: item.target ?? 'global',
          visibility: 'public',
          mimeType: 'image/svg+xml',
          fileSize,
          width,
          height,
          checksum,
          publishedAt: now,
        },
      });
      created++;
    } else {
      const sameContent = existing.checksum === checksum;
      const shouldBump = !sameContent || needWrite;
      const nextVersion = shouldBump ? existing.version + 1 : existing.version;
      let nextUrl = existing.url;
      if (shouldBump) {
        const nextDiskFile = `${safeCategory}/${safeKey}-v${nextVersion}.svg`;
        writeFileSync(join(STORAGE_ROOT, nextDiskFile), svg, 'utf8');
        nextUrl = `${PUBLIC_API_URL}/${ASSET_PUBLIC_ROOT}/${nextDiskFile}`;
        const dir = dirname(join(STORAGE_ROOT, nextDiskFile));
        if (existsSync(dir)) {
          for (const f of readdirSync(dir)) {
            if ((f.startsWith(`${safeKey}-v`) && f !== `${safeKey}-v${nextVersion}.svg`) && f.endsWith('.svg')) {
              rmSync(join(dir, f), { force: true });
            }
          }
        }
      }

      if (shouldBump || existing.url !== nextUrl || existing.category !== item.category || existing.isBundled !== (item.isBundled ?? true) || existing.sortOrder !== (item.sortOrder ?? 0) || existing.target !== (item.target ?? 'global')) {
        await prisma.asset.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            category: item.category,
            sortOrder: item.sortOrder ?? 0,
            target: item.target ?? 'global',
            isBundled: item.isBundled ?? true,
            ...(shouldBump
              ? {
                  version: nextVersion,
                  url: nextUrl,
                  thumbnailUrl: nextUrl,
                  checksum,
                  fileSize,
                  width,
                  height,
                }
              : {}),
          },
        });
        updated++;
      } else {
        unchanged++;
      }
    }
  }

  // Re-publish any catalog asset that was accidentally disabled/archived.
  await prisma.asset.updateMany({
    where: { key: { in: catalog.assets.map((a: any) => a.key) }, status: { in: ['disabled', 'archived', 'draft'] } },
    data: { status: 'published', isEnabled: true, publishedAt: now },
  });

  console.log(`[seed-assets] done: created=${created} updated=${updated} unchanged=${unchanged} total=${catalog.assets.length}`);
}

main()
  .catch((err) => {
    console.error('[seed-assets] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });