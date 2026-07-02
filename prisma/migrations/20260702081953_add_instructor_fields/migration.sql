-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('SKI', 'SNOWBOARD', 'TELEMARK', 'CROSS_COUNTRY');

-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "brevet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disciplines" "Discipline"[],
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "language" TEXT,
ADD COLUMN     "offPisteCert" BOOLEAN NOT NULL DEFAULT false;
