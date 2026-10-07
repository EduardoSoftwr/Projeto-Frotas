import { PrismaClient, VehicleStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.vehicle.upsert({
    where: { name: 'Carro do G&C' },
    create: {
      name: 'Carro do G&C',
      status: VehicleStatus.AVAILABLE,
      currentKm: 0,
    },
    update: {},
  })
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })