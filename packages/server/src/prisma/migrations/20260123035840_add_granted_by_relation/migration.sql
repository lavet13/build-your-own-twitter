/*
  Warnings:

  - You are about to drop the column `grantedBy` on the `UserPermission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserPermission" DROP COLUMN "grantedBy",
ADD COLUMN     "grantedById" TEXT;

-- CreateIndex
CREATE INDEX "UserPermission_grantedById_idx" ON "UserPermission"("grantedById");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
