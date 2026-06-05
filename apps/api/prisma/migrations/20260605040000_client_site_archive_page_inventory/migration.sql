ALTER TABLE "Client" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Site" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Site" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "SitePageInventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "postType" TEXT,
    "status" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "importance" TEXT NOT NULL DEFAULT 'normal',
    "recommendationReason" TEXT,
    "isMonitored" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePageInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SitePageInventory_siteId_fingerprint_key" ON "SitePageInventory"("siteId", "fingerprint");

ALTER TABLE "SitePageInventory" ADD CONSTRAINT "SitePageInventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePageInventory" ADD CONSTRAINT "SitePageInventory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
