-- CreateTable
CREATE TABLE "admin_authorization_requests" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL DEFAULT 'admin',
    "requestedPermissions" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_authorization_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_authorization_requests_status_createdAt_idx" ON "admin_authorization_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "admin_authorization_requests_playerId_status_idx" ON "admin_authorization_requests"("playerId", "status");

-- AddForeignKey
ALTER TABLE "admin_authorization_requests" ADD CONSTRAINT "admin_authorization_requests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_authorization_requests" ADD CONSTRAINT "admin_authorization_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;