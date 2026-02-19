const fs = require('fs');
const { execSync } = require('child_process');

console.log('Starting build process...');

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
    console.log('Detected Vercel environment.');
    if (fs.existsSync('prisma/schema.postgres.prisma')) {
        console.log('Swapping Prisma schema to use PostgreSQL...');
        fs.copyFileSync('prisma/schema.postgres.prisma', 'prisma/schema.prisma');
    } else {
        console.warn('prisma/schema.postgres.prisma not found. Using default schema.');
    }
} else {
    console.log('Not on Vercel. Using default Prisma schema (likely SQLite).');
}

try {
    console.log('Running prisma generate...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('Running next build...');
    execSync('next build', { stdio: 'inherit' });
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
