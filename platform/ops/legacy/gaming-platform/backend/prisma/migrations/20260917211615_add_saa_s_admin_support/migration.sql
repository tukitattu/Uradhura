-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "admin_permissions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "assignedAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "support_tickets_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL DEFAULT 'player',
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_adminId_permission_key" ON "admin_permissions"("adminId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");
