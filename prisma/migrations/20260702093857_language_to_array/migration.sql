/*
  Warnings:

  - You are about to drop the column `language` on the `Instructor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Instructor" DROP COLUMN "language",
ADD COLUMN     "languages" TEXT[];
