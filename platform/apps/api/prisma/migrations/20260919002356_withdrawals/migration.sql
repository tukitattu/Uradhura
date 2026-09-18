-- AlterTable
ALTER TABLE "players" ADD COLUMN     "kycVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawalBlacklistReason" TEXT,
ADD COLUMN     "withdrawalBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withdrawalWhitelisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "withdrawal_rules" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "regionCode" TEXT NOT NULL DEFAULT 'BD',
    "coinToCurrencyRate" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "minAmountCoins" INTEGER NOT NULL DEFAULT 100,
    "maxAmountCoins" INTEGER NOT NULL DEFAULT 50000,
    "maxMonthlyCoins" INTEGER NOT NULL DEFAULT 200000,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "timeWindowStart" TEXT NOT NULL DEFAULT '00:00',
    "timeWindowEnd" TEXT NOT NULL DEFAULT '23:59',
    "allowedDays" TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,0]',
    "autoApproveMaxCoins" INTEGER NOT NULL DEFAULT 0,
    "manualApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "feePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kycRequired" BOOLEAN NOT NULL DEFAULT false,
    "firstWithdrawalOnly" BOOLEAN NOT NULL DEFAULT false,
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "regionRestrictions" TEXT NOT NULL DEFAULT '[]',
    "tierCoinValues" TEXT NOT NULL DEFAULT '{}',
    "blacklistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whitelistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_methods" (
    "id" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "minAmountCoins" INTEGER NOT NULL DEFAULT 100,
    "maxAmountCoins" INTEGER NOT NULL DEFAULT 50000,
    "feePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "accountLabel" TEXT NOT NULL DEFAULT 'Account',
    "minAccountLength" INTEGER NOT NULL DEFAULT 0,
    "maxAccountLength" INTEGER NOT NULL DEFAULT 50,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "feeCoins" INTEGER NOT NULL DEFAULT 0,
    "netCoins" INTEGER NOT NULL,
    "rateApplied" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "amountCurrency" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "methodCode" TEXT NOT NULL,
    "accountHandle" TEXT NOT NULL,
    "accountName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "reviewNote" TEXT,
    "approvedAmountCoins" INTEGER,
    "monthlyPeriod" TEXT NOT NULL,
    "holdTxId" TEXT,
    "refundTxId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_withdrawal_overrides" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "maxMonthlyCoins" INTEGER,
    "coinRateOverride" DECIMAL(65,30),
    "note" TEXT,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_withdrawal_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_methods_methodCode_key" ON "withdrawal_methods"("methodCode");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_requests_idempotencyKey_key" ON "withdrawal_requests"("idempotencyKey");

-- CreateIndex
CREATE INDEX "withdrawal_requests_playerId_monthlyPeriod_idx" ON "withdrawal_requests"("playerId", "monthlyPeriod");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_createdAt_idx" ON "withdrawal_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_reviewedById_createdAt_idx" ON "withdrawal_requests"("reviewedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_withdrawal_overrides_playerId_key" ON "player_withdrawal_overrides"("playerId");

-- CreateIndex
CREATE INDEX "player_withdrawal_overrides_grantedById_idx" ON "player_withdrawal_overrides"("grantedById");

-- AddForeignKey
ALTER TABLE "withdrawal_rules" ADD CONSTRAINT "withdrawal_rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_methodCode_fkey" FOREIGN KEY ("methodCode") REFERENCES "withdrawal_methods"("methodCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_withdrawal_overrides" ADD CONSTRAINT "player_withdrawal_overrides_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_withdrawal_overrides" ADD CONSTRAINT "player_withdrawal_overrides_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

