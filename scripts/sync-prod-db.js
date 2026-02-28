const { execSync } = require('child_process');

console.log('Running Prisma DB Push for Production...');
console.log('This will sync your schema.postgres.prisma with your Vercel database.');

try {
    // We use npx prisma db push because you are not using migration files locally
    execSync('npx prisma db push --schema prisma/schema.postgres.prisma', { stdio: 'inherit' });
    console.log('Database synced successfully!');
} catch (error) {
    console.error('Failed to sync database. Make sure you have your .env file with POSTGRES_PRISMA_URL set, or run this in an environment that has it.');
    process.exit(1);
}
