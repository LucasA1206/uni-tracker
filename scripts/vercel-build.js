const fs = require('fs');
const { execSync } = require('child_process');

console.log('Starting build process...');

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
    console.log('Detected Vercel environment.');
    if (fs.existsSync('prisma/schema.postgres.prisma')) {
        console.log('Using Prisma schema for PostgreSQL (prisma/schema.postgres.prisma).');
    } else {
        console.warn('prisma/schema.postgres.prisma not found. Using default schema.');
    }
} else {
    console.log('Not on Vercel. Using default Prisma schema (likely SQLite).');
}

const prismaGenerateCmd = isVercel && fs.existsSync('prisma/schema.postgres.prisma')
    ? 'npx prisma generate --schema prisma/schema.postgres.prisma'
    : 'npx prisma generate';

try {
    console.log('Running prisma generate...');
    execSync(prismaGenerateCmd, { stdio: 'inherit' });

    console.log('Running next build...');
    execSync('npx next build', { stdio: 'inherit' });
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
