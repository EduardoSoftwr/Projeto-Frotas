-- A vehicle can have at most one active usage, including writes outside the API.
CREATE UNIQUE INDEX "Usage_one_IN_USE_per_vehicle_key"
ON "Usage" ("vehicleId")
WHERE "status" = 'IN_USE';
