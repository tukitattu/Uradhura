-- CreateTable
CREATE TABLE "game_denomination_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "denominations" TEXT NOT NULL DEFAULT '[1000,5000,50000,100000]',
    "minBet" REAL NOT NULL DEFAULT 100,
    "maxBet" REAL NOT NULL DEFAULT 1000000,
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_denomination_configs_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "optionLabels" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "multiplier" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_packages_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_call_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "channelName" TEXT NOT NULL DEFAULT 'admin-broadcast',
    "role" TEXT NOT NULL DEFAULT 'host',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "video_call_access_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "packageId" TEXT,
    "provider" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountCents" INTEGER NOT NULL,
    "tokenAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receiptData" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payment_orders_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_gateway_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "publicKey" TEXT,
    "webhookUrl" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "updatedBy" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "service_health_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uptimeSeconds" INTEGER NOT NULL,
    "dbPingMs" INTEGER NOT NULL,
    "memUsedMb" REAL NOT NULL,
    "memTotalMb" REAL NOT NULL,
    "nodeVersion" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "pendingMigrations" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "game_denomination_configs_gameId_key" ON "game_denomination_configs"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "video_call_access_playerId_key" ON "video_call_access"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_configs_provider_key" ON "payment_gateway_configs"("provider");
