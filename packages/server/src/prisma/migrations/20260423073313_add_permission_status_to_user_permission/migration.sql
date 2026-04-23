-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'PENDING');

-- AlterTable
ALTER TABLE "UserPermission" ADD COLUMN     "status" "PermissionStatus" NOT NULL DEFAULT 'ACTIVE';
