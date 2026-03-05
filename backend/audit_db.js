
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Audit ---');

    try {
        const householdCount = await prisma.household.count();
        console.log(`Model Household (New): ${householdCount}`);
    } catch (e) {
        console.log(`Model Household (New): Not accessible or error`);
    }

    try {
        const rawHouseholds = await prisma.$queryRaw`SELECT count(*) FROM households`;
        console.log(`Table households (Legacy):`, rawHouseholds);
    } catch (e) {
        console.log(`Table households (Legacy): Not found`);
    }

    try {
        const projectCount = await prisma.project.count();
        const rawProjects = await prisma.$queryRaw`SELECT count(*) FROM projects`;
        console.log(`Model Project (New): ${projectCount}`);
        console.log(`Table projects (Legacy):`, rawProjects);
    } catch (e) {
        console.log(`Error checking projects`);
    }
}

main().finally(() => prisma.$disconnect());
