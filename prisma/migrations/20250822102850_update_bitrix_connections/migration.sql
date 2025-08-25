/*
  Warnings:

  - The values [INTEGRATION,API,WEBHOOK,DATABASE,SERVICE] on the enum `ConnectionType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[webhookUrl]` on the table `Connection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `webhookUrl` to the `Connection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BitrixCategory" AS ENUM ('CREATE_DEAL', 'CREATE_LEAD');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."ConnectionType_new" AS ENUM ('BITRIX');
ALTER TABLE "public"."Connection" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."Connection" ALTER COLUMN "type" TYPE "public"."ConnectionType_new" USING ("type"::text::"public"."ConnectionType_new");
ALTER TYPE "public"."ConnectionType" RENAME TO "ConnectionType_old";
ALTER TYPE "public"."ConnectionType_new" RENAME TO "ConnectionType";
DROP TYPE "public"."ConnectionType_old";
ALTER TABLE "public"."Connection" ALTER COLUMN "type" SET DEFAULT 'BITRIX';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Connection" ADD COLUMN     "category" "public"."BitrixCategory" NOT NULL DEFAULT 'CREATE_DEAL',
ADD COLUMN     "webhookUrl" TEXT NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'BITRIX';

-- CreateIndex
CREATE UNIQUE INDEX "Connection_webhookUrl_key" ON "public"."Connection"("webhookUrl");
