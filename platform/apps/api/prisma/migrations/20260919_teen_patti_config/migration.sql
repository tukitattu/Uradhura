-- AlterTable
ALTER TABLE "teen_patti_hands" ADD COLUMN     "rakeCoins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rakePercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "teen_patti_configs" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teen_patti_configs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "teen_patti_configs" ADD CONSTRAINT "teen_patti_configs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

