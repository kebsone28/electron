const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const household = await prisma.household.findFirst();
    console.log(JSON.stringify(household, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
