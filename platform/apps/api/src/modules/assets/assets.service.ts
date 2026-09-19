// ============================================================
// ASSET REGISTRY — SERVICE
// Registry is the single source of truth for UI/media asset
// resolution across the player APK, admin web and the games.
// Lifecycle: draft → published → disabled → archived (restorable).
// Replace = new file write at a bumped unique versioned URL; the
// public manifest is content-hashed so clients only re-download
// when something actually changed.
// ============================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetStorageService } from './asset-storage.service';
import { AuditService } from '../audit/audit.service';
import { ASSET_STATUSES, ASSET_TYPE_MAP, ASSET_MAX_SIZE_BYTES } from './asset.constants';
import { CreateAssetDto, UpdateAssetDto, BulkUpdateDto } from './dto';

type FilePayload = {
  originalname?: string;
  buffer?: Buffer;
  size?: number;
  mimetype?: string;
};

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AssetStorageService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------
  // CRUD
  // ----------------------------------------------------------

  async create(dto: CreateAssetDto, actorId?: string) {
    const existing = await this.prisma.asset.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Asset key "${dto.key}" already exists`);
    }
    const format = dto.format ?? 'svg';
    const type = ASSET_TYPE_MAP[format]?.type ?? 'image/svg+xml';
    const asset = await this.prisma.asset.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        type,
        format,
        extension: format,
        target: dto.target ?? 'global',
        sortOrder: dto.sortOrder ?? 0,
        isBundled: dto.isBundled ?? false,
        scope: dto.scope,
        localization: dto.localization,
        visibility: dto.visibility ?? 'public',
        status: 'draft',
        createdBy: actorId,
      },
    });
    await this.audit.log({
      actorId,
      actorType: 'admin',
      action: 'ASSET_CREATED',
      entityType: 'asset',
      entityId: asset.id,
      after: { key: asset.key, category: asset.category, format } as any,
    });
    return asset;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    target?: string;
    search?: string;
    visibility?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Prisma.AssetWhereInput = {};

    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.target) where.target = query.target;
    if (query.visibility) where.visibility = query.visibility;
    if (query.search) {
      where.OR = [
        { key: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, actorId?: string) {
    const asset = await this.findOne(id);
    const before = cleanForAudit(asset as any) as any;

    if (dto.status && !ASSET_STATUSES.includes(dto.status as (typeof ASSET_STATUSES)[number])) {
      throw new BadRequestException('Invalid asset status');
    }

    const data: Prisma.AssetUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.target !== undefined) data.target = dto.target;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.isBundled !== undefined) data.isBundled = dto.isBundled;
    if (dto.scope !== undefined) data.scope = dto.scope;
    if (dto.localization !== undefined) data.localization = dto.localization;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.thumbnailUrl !== undefined) data.thumbnailUrl = dto.thumbnailUrl;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : asset.startsAt;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : asset.endsAt;

    if (dto.status === 'published') {
      data.status = 'published';
      data.publishedAt = new Date();
      data.isEnabled = true;
    } else if (dto.status === 'archived') {
      data.status = 'archived';
      data.archivedAt = new Date();
    } else if (dto.status === 'draft') {
      data.status = 'draft';
      data.archivedAt = null;
    }

    data.updatedBy = actorId;

    const updated = await this.prisma.asset.update({
      where: { id },
      data,
    });
    await this.audit.log({
      actorId,
      actorType: 'admin',
      action: 'ASSET_UPDATED',
      entityType: 'asset',
      entityId: asset.id,
      before,
      after: cleanForAudit(updated as any) as any,
    });
    return updated;
  }

  // ----------------------------------------------------------
  // File upload / replace
  // ----------------------------------------------------------

  async uploadFile(id: string, file: FilePayload, actorId?: string) {
    if (!file?.buffer || file.buffer.byteLength === 0) {
      throw new BadRequestException('File content is required (multipart field "file")');
    }
    if (file.buffer.byteLength > ASSET_MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${ASSET_MAX_SIZE_BYTES / (1024 * 1024)} MB upload limit`,
      );
    }
    const asset = await this.findOne(id);
    const ext = this.storage.resolveExtension(file.originalname ?? '');

    const isReplace = Boolean(asset.url);
    const nextVersion = isReplace ? asset.version + 1 : asset.version;

    const stored = await this.storage.save(asset.key, asset.category, nextVersion, ext, file.buffer);
    const publicUrl = this.storage.absoluteUrl(stored.urlPath);

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        url: publicUrl,
        thumbnailUrl: publicUrl,
        fileName: file.originalname ?? null,
        mimeType: stored.mimeType,
        format: stored.format,
        extension: stored.format,
        type: stored.mimeType,
        fileSize: stored.fileSize,
        checksum: stored.checksum,
        width: stored.width,
        height: stored.height,
        version: nextVersion,
        status: asset.status === 'published' ? 'published' : asset.status,
        updatedBy: actorId,
      },
    });

    if (isReplace) {
      await this.storage.cleanupOrphanedResources(nextVersion, stored.relativePath);
    }

    await this.audit.log({
      actorId,
      actorType: 'admin',
      action: isReplace ? 'ASSET_REPLACED' : 'ASSET_UPLOADED',
      entityType: 'asset',
      entityId: asset.id,
      after: {
        version: nextVersion,
        format: stored.format,
        fileSize: stored.fileSize,
        checksum: stored.checksum,
        url: publicUrl,
      } as any,
    });
    return updated;
  }

  // ----------------------------------------------------------
  // Lifecycle actions
  // ----------------------------------------------------------

  async publish(id: string, actorId?: string) {
    const asset = await this.findOne(id);
    if (!asset.url && !asset.isBundled) {
      throw new BadRequestException('Cannot publish an asset without a file. Upload a file first.');
    }
    return this.update(id, { status: 'published' } as UpdateAssetDto, actorId);
  }

  async setEnabled(id: string, enabled: boolean, actorId?: string) {
    const asset = await this.findOne(id);
    if (asset.status === 'archived') {
      throw new BadRequestException('Archived assets must be restored before they can be re-enabled');
    }
    return this.update(id, { isEnabled: enabled } as UpdateAssetDto, actorId);
  }

  async archive(id: string, actorId?: string) {
    await this.findOne(id);
    return this.update(id, { status: 'archived' } as UpdateAssetDto, actorId);
  }

  async restore(id: string, actorId?: string) {
    const asset = await this.findOne(id);
    if (asset.status !== 'archived') {
      throw new BadRequestException('Only archived assets are restorable');
    }
    return this.update(id, { status: 'draft' } as UpdateAssetDto, actorId);
  }

  async bulkApply(action: BulkUpdateDto['action'], ids: string[], actorId?: string) {
    const results: string[] = [];
    for (const id of ids) {
      try {
        const asset = await this.findOne(id);
        switch (action) {
          case 'publish':
            await this.publish(id, actorId);
            break;
          case 'enable':
            await this.setEnabled(id, true, actorId);
            break;
          case 'disable':
            await this.setEnabled(id, false, actorId);
            break;
          case 'archive':
            await this.archive(id, actorId);
            break;
          case 'restore':
            await this.restore(id, actorId);
            break;
          case 'draft':
            await this.update(id, { status: 'draft' }, actorId);
            break;
        }
        results.push(`${action}:${asset.key}`);
      } catch (err) {
        results.push(`${action}:${(err as Error).message}`);
      }
    }
    return { applied: results };
  }

  async delete(id: string, actorId?: string) {
    const asset = await this.findOne(id);
    if (asset.status !== 'archived') {
      throw new BadRequestException('Only archived assets can be deleted. Archive it first.');
    }
    if (asset.url) {
      const rel = this.storageRelativePath(asset.url);
      if (rel) await this.storage.remove(rel);
    }
    await this.prisma.asset.delete({ where: { id } });
    await this.audit.log({
      actorId,
      actorType: 'admin',
      action: 'ASSET_DELETED',
      entityType: 'asset',
      entityId: asset.id,
      before: { key: asset.key, category: asset.category } as any,
    });
    return { deleted: true, key: asset.key };
  }

  private storageRelativePath(url: string): string | null {
    const prefix = this.storage.publicRoot;
    const idx = url.indexOf(prefix);
    if (idx === -1) return null;
    return url.slice(idx + prefix.length + 1);
  }

  // ----------------------------------------------------------
  // Public manifest (consumed by the player APK / web)
  // ----------------------------------------------------------

  async manifest() {
    const now = new Date();
    const rows = await this.prisma.asset.findMany({
      where: {
        status: 'published',
        isEnabled: true,
        visibility: { not: 'internal' },
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
        ],
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
    });

    const baseUrl = this.storage.baseUrl;
    const assets = rows.map((a) => ({
      key: a.key,
      name: a.name,
      category: a.category,
      type: a.mimeType || a.type,
      format: a.format,
      url: needsAbsolute(a.url ?? '') ? a.url : `${baseUrl}${a.url ?? ''}`,
      thumbnailUrl: a.thumbnailUrl
        ? needsAbsolute(a.thumbnailUrl)
          ? a.thumbnailUrl
          : `${baseUrl}${a.thumbnailUrl}`
        : null,
      version: a.version,
      sortOrder: a.sortOrder,
      target: a.target,
      isBundled: a.isBundled,
      localization: a.localization ? safeJson(a.localization) : undefined,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      visibility: a.visibility,
      width: a.width,
      height: a.height,
      checksum: a.checksum ?? null,
    }));

    const fingerprint = createHash('sha1')
      .update(assets.map((a) => `${a.key}:${a.version}`).join('|') || 'empty')
      .digest('hex');

    const updatedAt = rows.reduce(
      (max, a) => (a.updatedAt > max ? a.updatedAt : max),
      new Date(0),
    );

    return {
      version: fingerprint,
      assetCount: assets.length,
      updatedAt: updatedAt.toISOString(),
      baseUrl,
      assets,
    };
  }
}

function needsAbsolute(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function cleanForAudit(asset: Record<string, any>): Record<string, unknown> {
  return {
    key: asset.key,
    name: asset.name,
    category: asset.category,
    status: asset.status,
    isEnabled: asset.isEnabled,
    version: asset.version,
    target: asset.target,
    sortOrder: asset.sortOrder,
    scope: asset.scope,
    visibility: asset.visibility,
    startsAt: asset.startsAt?.toISOString?.(),
    endsAt: asset.endsAt?.toISOString?.(),
    url: asset.url,
  };
}