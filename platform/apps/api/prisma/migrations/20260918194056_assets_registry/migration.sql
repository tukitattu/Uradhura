-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT,
    "extension" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isBundled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "target" TEXT,
    "scope" TEXT,
    "localization" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_key_key" ON "assets"("key");

-- CreateIndex
CREATE INDEX "assets_category_status_idx" ON "assets"("category", "status");

-- CreateIndex
CREATE INDEX "assets_target_status_idx" ON "assets"("target", "status");

-- CreateIndex
CREATE INDEX "assets_status_isEnabled_startsAt_endsAt_idx" ON "assets"("status", "isEnabled", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
