/*
  Warnings:

  - A unique constraint covering the columns `[type,identifier]` on the table `AuthProvider` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identifier` to the `AuthProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `AuthProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AuthProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuthProvider" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "credential" TEXT,
ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" "AuthProviderType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "AuthProvider_userId_idx" ON "AuthProvider"("userId");

-- CreateIndex
CREATE INDEX "AuthProvider_type_identifier_idx" ON "AuthProvider"("type", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProvider_type_identifier_key" ON "AuthProvider"("type", "identifier");
