// ============================================================
// ASSET STORAGE — local disk provider (swap for S3/GCS later)
// Files are written to {root}/{category}/{key}-v{version}.{ext}
// so every published revision has a unique immutable URL which
// supports long-lived client caching (version drives invalidation).
// ============================================================

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { join, dirname, extname, basename, normalize } from 'path';
import { ALLOWED_ASSET_EXTENSIONS, ASSET_TYPE_MAP } from './asset.constants';

export interface StoredAsset {
  urlPath: string; // e.g. /assets/bg.home/bg.home.default-v3.svg
  filePath: string; // absolute path on disk
  relativePath: string; // path relative to storage root
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  width: number | null;
  height: number | null;
  format: string;
}

@Injectable()
export class AssetStorageService {
  constructor(private readonly config: ConfigService) {}

  get root(): string {
    return this.config.get<string>('ASSET_STORAGE_PATH', './storage/assets');
  }

  get publicRoot(): string {
    return this.config.get<string>('ASSET_PUBLIC_ROOT', '/assets');
  }

  get baseUrl(): string {
    // Trailing slash trimmed. Clients combine baseUrl + urlPath.
    return (this.config.get<string>('PUBLIC_API_URL', 'http://localhost:4002') ?? '').replace(/\/+$/, '');
  }

  sanitizeKey(key: string): string {
    // Keys become part of file paths — restrict to safe characters.
    const clean = key.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    if (!clean) {
      throw new BadRequestException('Asset key may only contain letters, numbers, dots, dashes and underscores');
    }
    return clean;
  }

  sanitizeCategory(category: string): string {
    const clean = category.replace(/[^a-zA-Z0-9.-]/g, '-');
    if (!clean) {
      throw new BadRequestException('Asset category is invalid');
    }
    return clean;
  }

  resolveExtension(originalName: string): string {
    const ext = extname(originalName || '').toLowerCase().replace('.', '');
    if (!ALLOWED_ASSET_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Unsupported file type "${ext}". Allowed: ${ALLOWED_ASSET_EXTENSIONS.join(', ')}`,
      );
    }
    return ext;
  }

  absoluteUrl(urlPath: string): string {
    return `${this.baseUrl}${urlPath}`;
  }

  toPublicPath(category: string, key: string, version: number, ext: string): string {
    return `${this.publicRoot}/${this.sanitizeCategory(category)}/${this.sanitizeKey(key)}-v${version}.${ext}`;
  }

  buildFileName(key: string, ext: string): string {
    return `${this.sanitizeKey(key)}.${ext}`;
  }

  async save(
    key: string,
    category: string,
    version: number,
    ext: string,
    buffer: Buffer,
  ): Promise<StoredAsset> {
    if (!ALLOWED_ASSET_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Unsupported file type "${ext}".`);
    }
    const safeKey = this.sanitizeKey(key);
    const safeCategory = this.sanitizeCategory(category);
    // Shuffle CAREFULLY: temp file avoids partial writes for concurrent readers.
    const tmpName = `${randomUUID()}.tmp`;
    const tmpPath = join(this.root, safeCategory, tmpName);
    const fileName = `${safeKey}.${ext}`;
    const relativePath = join(safeCategory, `${safeKey}-v${version}.${ext}`);
    const filePath = join(this.root, relativePath);

    try {
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(tmpPath, buffer);
      await fs.rename(tmpPath, filePath); // atomic on same volume
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => undefined);
      throw new InternalServerErrorException(`Failed to store asset: ${(err as Error).message}`);
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const { width, height } = extractDimensions(buffer, ext);
    return {
      urlPath: this.toPublicPath(category, key, version, ext),
      filePath,
      relativePath,
      fileName,
      mimeType: ASSET_TYPE_MAP[ext].type,
      fileSize: buffer.byteLength,
      checksum,
      width,
      height,
      format: ext,
    };
  }

  stream(path: string) {
    return createReadStream(path);
  }

  exists(filePath: string): boolean {
    return existsSync(normalize(filePath));
  }

  async remove(relativePath: string): Promise<void> {
    // Paths are storage-root relative (see save()) — resolve here so the
    // delete flow can pass a relative path and it maps to the right file.
    if (!relativePath) return;
    const absolute = join(this.root, relativePath);
    if (existsSync(normalize(absolute))) {
      await fs.rm(absolute, { force: true }).catch(() => undefined);
    }
  }

  async cleanupOrphanedResources(olderThanVersion: number, relativePath: string) {
    // Best-effort cleanup of an older revision of the same asset resource.
    const dir = dirname(join(this.root, relativePath));
    const base = basename(relativePath).replace(/-v\d+\.([a-z0-9]+)$/i, '');
    try {
      const entries = await fs.readdir(dir);
      const targets = entries.filter(
        (e) => e.startsWith(`${base}-v`) && !e.endsWith(`-v${olderThanVersion}.`),
      );
      // Delete previous revisions but keep the current one.
      const currentVersionPrefix = `${base}-v`;
      for (const entry of targets) {
        const m = entry.match(/-v(\d+)\./);
        if (m && Number(m[1]) !== olderThanVersion) {
          await fs.rm(join(dir, entry), { force: true }).catch(() => undefined);
        }
        if (m && Number(m[1]) === olderThanVersion) void currentVersionPrefix;
      }
    } catch {
      // Non-fatal.
    }
  }
}

// Best-effort dimension probe. Only SVG is parsed (regex on width/height);
// raster decoding requires a native decoder which is intentionally kept out
// of the API runtime. Raster sizes are left null rather than guessed.
function extractDimensions(buffer: Buffer, ext: string): { width: number | null; height: number | null } {
  if (ext === 'svg') {
    const str = buffer.toString('utf8');
    const w = str.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
    const h = str.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
    if (w && h) {
      const width = parseFloat(w[1]);
      const height = parseFloat(h[1]);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        return { width, height };
      }
    }
    const vb = str.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/i);
    if (vb) {
      const parts = vb[1].split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        return { width: parts[2], height: parts[3] };
      }
    }
  }
  return { width: null, height: null };
}