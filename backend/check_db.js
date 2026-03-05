import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const counts = await prisma.household.count();
    const statuses = await prisma.household.groupBy({ by: ['status'], _count: true });
    console.log('Total Households:', counts);
    console.log('Statuses:', statuses);
}
main().catch(console.error).finally(() => prisma.$disconnect());
