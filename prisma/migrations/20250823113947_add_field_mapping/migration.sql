-- AlterTable
ALTER TABLE "public"."Connection" ADD COLUMN     "fieldMapping" TEXT,
ADD COLUMN     "funnelId" TEXT,
ADD COLUMN     "stageId" TEXT;

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "bitrixWebhookUrl" TEXT;
