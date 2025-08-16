-- 1) Ajouter la colonne en NULLABLE
ALTER TABLE "WebhookEvent" ADD COLUMN "webhookId" TEXT;

-- 2) Backfill pour les lignes existantes
-- On n’a pas l’ID Shopify historique (header), donc on met un identifiant stable et unique :
-- 'legacy_' || id (id est déjà unique → on respecte l’unicité)
UPDATE "WebhookEvent"
SET "webhookId" = 'legacy_' || "id"
WHERE "webhookId" IS NULL;

-- 3) Ajouter l’unique index
CREATE UNIQUE INDEX "WebhookEvent_webhookId_key" ON "WebhookEvent"("webhookId");

-- 4) Rendre NOT NULL
ALTER TABLE "WebhookEvent" ALTER COLUMN "webhookId" SET NOT NULL;
