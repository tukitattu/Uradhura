-- CreateTable
CREATE TABLE "teen_patti_tables" (
    "id" TEXT NOT NULL,
    "tableCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bootAmount" INTEGER NOT NULL DEFAULT 10,
    "chaalCap" INTEGER NOT NULL DEFAULT 4,
    "maxSeats" INTEGER NOT NULL DEFAULT 6,
    "minPlayers" INTEGER NOT NULL DEFAULT 3,
    "minBuyIn" INTEGER NOT NULL DEFAULT 100,
    "maxBuyIn" INTEGER NOT NULL DEFAULT 10000,
    "botFill" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'open',
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "nextHandNo" INTEGER NOT NULL DEFAULT 1,
    "dealerSeatNo" INTEGER NOT NULL DEFAULT 1,
    "handInPlay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teen_patti_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teen_patti_seats" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "playerId" TEXT,
    "name" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "chips" INTEGER NOT NULL DEFAULT 0,
    "isSeated" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "teen_patti_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teen_patti_hands" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "handNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'betting',
    "dealerSeatNo" INTEGER NOT NULL,
    "currentTurnSeatNo" INTEGER,
    "pot" INTEGER NOT NULL DEFAULT 0,
    "stake" INTEGER NOT NULL DEFAULT 0,
    "stakeLevel" INTEGER NOT NULL DEFAULT 0,
    "seedCommitHash" TEXT NOT NULL,
    "seedClientSeed" TEXT NOT NULL,
    "seedNonce" INTEGER NOT NULL DEFAULT 0,
    "seedServerSeed" TEXT,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teen_patti_hands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teen_patti_seat_hands" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "playerId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "cards" TEXT NOT NULL,
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "chipsIn" INTEGER NOT NULL DEFAULT 0,
    "committed" INTEGER NOT NULL DEFAULT 0,
    "folded" BOOLEAN NOT NULL DEFAULT false,
    "allIn" BOOLEAN NOT NULL DEFAULT false,
    "result" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "teen_patti_seat_hands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teen_patti_actions" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "handOrder" INTEGER NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "playerId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "pot" INTEGER NOT NULL DEFAULT 0,
    "stake" INTEGER NOT NULL DEFAULT 0,
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teen_patti_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_tables_tableCode_key" ON "teen_patti_tables"("tableCode");

-- CreateIndex
CREATE INDEX "teen_patti_tables_status_idx" ON "teen_patti_tables"("status");

-- CreateIndex
CREATE INDEX "teen_patti_seats_playerId_idx" ON "teen_patti_seats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_seats_tableId_seatNo_key" ON "teen_patti_seats"("tableId", "seatNo");

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_seats_playerId_tableId_key" ON "teen_patti_seats"("playerId", "tableId");

-- CreateIndex
CREATE INDEX "teen_patti_hands_status_idx" ON "teen_patti_hands"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_hands_tableId_handNo_key" ON "teen_patti_hands"("tableId", "handNo");

-- CreateIndex
CREATE INDEX "teen_patti_seat_hands_playerId_idx" ON "teen_patti_seat_hands"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_seat_hands_handId_seatNo_key" ON "teen_patti_seat_hands"("handId", "seatNo");

-- CreateIndex
CREATE INDEX "teen_patti_actions_handId_createdAt_idx" ON "teen_patti_actions"("handId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "teen_patti_actions_handId_handOrder_key" ON "teen_patti_actions"("handId", "handOrder");

-- AddForeignKey
ALTER TABLE "teen_patti_seats" ADD CONSTRAINT "teen_patti_seats_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "teen_patti_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_seats" ADD CONSTRAINT "teen_patti_seats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_hands" ADD CONSTRAINT "teen_patti_hands_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "teen_patti_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_seat_hands" ADD CONSTRAINT "teen_patti_seat_hands_handId_fkey" FOREIGN KEY ("handId") REFERENCES "teen_patti_hands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_seat_hands" ADD CONSTRAINT "teen_patti_seat_hands_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_actions" ADD CONSTRAINT "teen_patti_actions_handId_fkey" FOREIGN KEY ("handId") REFERENCES "teen_patti_hands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teen_patti_actions" ADD CONSTRAINT "teen_patti_actions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

