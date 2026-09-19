-- DropForeignKey
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_adminId_fkey";

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "payment_orders" ADD COLUMN     "creditedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admin_games" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" TEXT NOT NULL DEFAULT 'allow',
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "maxGames" INTEGER,
    "features" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_subscriptions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "accessExpiresAt" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "nextPaymentDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invoices" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_commissions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "gameId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "turnover" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "houseEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'coins',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentOrderId" TEXT,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'received',
    "payload" TEXT NOT NULL,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'coins',
    "amount" DECIMAL(65,30) NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "txRef" TEXT NOT NULL,
    "note" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_access" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_game_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_limits" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'coins',
    "dailyDepositLimitCents" INTEGER,
    "dailyLossLimit" DECIMAL(65,30),
    "dailyBetLimit" DECIMAL(65,30),
    "weeklyLossLimit" DECIMAL(65,30),
    "maxSessionMinutes" INTEGER,
    "selfExcludedUntil" TIMESTAMP(3),
    "coolOffUntil" TIMESTAMP(3),
    "selfExclusionReason" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_games_gameId_idx" ON "admin_games"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_games_adminId_gameId_key" ON "admin_games"("adminId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_adminId_permissionId_key" ON "admin_permissions"("adminId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_plans_name_key" ON "admin_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_subscriptions_adminId_key" ON "admin_subscriptions"("adminId");

-- CreateIndex
CREATE INDEX "admin_subscriptions_planId_idx" ON "admin_subscriptions"("planId");

-- CreateIndex
CREATE INDEX "admin_subscriptions_status_currentPeriodEnd_idx" ON "admin_subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "admin_invoices_adminId_createdAt_idx" ON "admin_invoices"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_invoices_status_dueAt_idx" ON "admin_invoices"("status", "dueAt");

-- CreateIndex
CREATE INDEX "admin_commissions_status_periodEnd_idx" ON "admin_commissions"("status", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "admin_commissions_adminId_gameId_periodStart_periodEnd_key" ON "admin_commissions"("adminId", "gameId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "payment_webhook_events_status_createdAt_idx" ON "payment_webhook_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payment_webhook_events_paymentOrderId_idx" ON "payment_webhook_events"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_eventId_key" ON "payment_webhook_events"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transfers_txRef_key" ON "wallet_transfers"("txRef");

-- CreateIndex
CREATE INDEX "wallet_transfers_senderId_createdAt_idx" ON "wallet_transfers"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transfers_receiverId_createdAt_idx" ON "wallet_transfers"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "player_game_access_gameId_isEnabled_idx" ON "player_game_access"("gameId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_access_playerId_gameId_key" ON "player_game_access"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "player_limits_playerId_key" ON "player_limits"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_idempotencyKey_key" ON "payment_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_orders_status_createdAt_idx" ON "payment_orders"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orders_provider_externalOrderId_key" ON "payment_orders"("provider", "externalOrderId");

-- AddForeignKey
ALTER TABLE "admin_games" ADD CONSTRAINT "admin_games_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_games" ADD CONSTRAINT "admin_games_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_subscriptions" ADD CONSTRAINT "admin_subscriptions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_subscriptions" ADD CONSTRAINT "admin_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "admin_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invoices" ADD CONSTRAINT "admin_invoices_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invoices" ADD CONSTRAINT "admin_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "admin_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_commissions" ADD CONSTRAINT "admin_commissions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_commissions" ADD CONSTRAINT "admin_commissions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transfers" ADD CONSTRAINT "wallet_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transfers" ADD CONSTRAINT "wallet_transfers_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_access" ADD CONSTRAINT "player_game_access_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_access" ADD CONSTRAINT "player_game_access_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_limits" ADD CONSTRAINT "player_limits_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

