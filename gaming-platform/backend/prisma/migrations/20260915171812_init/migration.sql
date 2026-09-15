-- CreateTable
CREATE TABLE "design_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "game_branding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameSlug" TEXT NOT NULL,
    "displayName" TEXT,
    "logoUrl" TEXT,
    "iconEmoji" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "bgGradient" TEXT,
    "tagline" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" TEXT NOT NULL DEFAULT 'player,admin,super_admin',
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "houseEdge" REAL NOT NULL DEFAULT 5.0,
    "maxPayoutPerRound" REAL NOT NULL DEFAULT 10000,
    "jackpotWeight" REAL NOT NULL DEFAULT 1.0,
    "vipAdjustment" REAL NOT NULL DEFAULT 0.0,
    "maxDailyLoss" REAL NOT NULL DEFAULT 100000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_configurations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_game_configurations" ("configData", "createdAt", "gameId", "houseEdge", "id", "isActive", "jackpotWeight", "maxDailyLoss", "maxPayoutPerRound", "updatedAt", "vipAdjustment") SELECT "configData", "createdAt", "gameId", "houseEdge", "id", "isActive", "jackpotWeight", "maxDailyLoss", "maxPayoutPerRound", "updatedAt", "vipAdjustment" FROM "game_configurations";
DROP TABLE "game_configurations";
ALTER TABLE "new_game_configurations" RENAME TO "game_configurations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "design_tokens_scope_key_key" ON "design_tokens"("scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "game_branding_gameSlug_key" ON "game_branding"("gameSlug");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
