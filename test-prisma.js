const { PrismaClient } = require('./prisma/generated/postgres-client');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Testing connection...');
    const result = await prisma.user.findMany();
    console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
