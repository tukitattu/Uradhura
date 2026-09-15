-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "totalDeposit" REAL NOT NULL DEFAULT 0,
    "totalWon" REAL NOT NULL DEFAULT 0,
    "totalLost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallet_accounts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_walletAccountId_fkey" FOREIGN KEY ("walletAccountId") REFERENCES "wallet_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "game_configurations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "houseEdge" REAL NOT NULL DEFAULT 5.0,
    "maxPayoutPerRound" REAL NOT NULL DEFAULT 10000,
    "jackpotWeight" REAL NOT NULL DEFAULT 1.0,
    "vipAdjustment" REAL NOT NULL DEFAULT 0.0,
    "maxDailyLoss" REAL NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_configurations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "multiplier" REAL NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#ffffff',
    "iconUrl" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "game_options_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "bettingEndsAt" DATETIME,
    "resultData" TEXT,
    "winnerId" TEXT,
    "totalBetAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "settledAt" DATETIME,
    CONSTRAINT "game_rounds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_bets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "txRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payout" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "game_bets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "game_rounds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_bets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_bets_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "game_options" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "winningOption" TEXT NOT NULL,
    "resultData" TEXT NOT NULL DEFAULT '{}',
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT "game_results_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "game_rounds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "payout" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txRef" TEXT,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_settlements_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "game_rounds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "game_settlements_betId_fkey" FOREIGN KEY ("betId") REFERENCES "game_bets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "token_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceUsd" REAL NOT NULL,
    "baseTokens" INTEGER NOT NULL,
    "bonusTokens" INTEGER NOT NULL DEFAULT 0,
    "isSpecialOffer" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "expiryDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "profit_risk_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseHouseEdge" REAL NOT NULL DEFAULT 8.0,
    "vipAdjustment" REAL NOT NULL DEFAULT 1.5,
    "maxPayoutPerRound" REAL NOT NULL DEFAULT 10000,
    "jackpotWeight" REAL NOT NULL DEFAULT 1.0,
    "maxDailyLossPerPlayer" REAL NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "player_overrides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "houseEdge" REAL,
    "customLossLimit" REAL,
    "tokenBalance" REAL,
    "notes" TEXT,
    "appliedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'system',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "players" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "players_username_key" ON "players"("username");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_playerId_key" ON "wallet_accounts"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_idempotencyKey_key" ON "wallet_transactions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "game_bets_idempotencyKey_key" ON "game_bets"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_roundId_key" ON "game_results"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "game_settlements_betId_key" ON "game_settlements"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "player_overrides_playerId_key" ON "player_overrides"("playerId");
