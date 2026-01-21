/*
  Warnings:

  - You are about to drop the column `category` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `deprecatedAt` on the `Permission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "category",
DROP COLUMN "deprecatedAt";
