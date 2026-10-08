CREATE TABLE "UsageIncident" (
    "id" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageIncident_usageId_createdAt_idx" ON "UsageIncident"("usageId", "createdAt");
CREATE INDEX "UsageIncident_vehicleId_createdAt_idx" ON "UsageIncident"("vehicleId", "createdAt");

ALTER TABLE "UsageIncident"
ADD CONSTRAINT "UsageIncident_usageId_fkey"
FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageIncident"
ADD CONSTRAINT "UsageIncident_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
