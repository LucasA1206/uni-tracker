const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const userData = require('./postgres-user.json');

async function main() {
    console.log(`Injecting user ${userData.username} into local dev.db...`);

    try {
        const existing = await prisma.user.findFirst({ where: { username: userData.username } });

        if (existing) {
            console.log(`User ${userData.username} already exists in dev.db! (ID: ${existing.id})`);
            return;
        }

        // SQLite won't accept googleApiKey yet because we haven't Prisma migrated local db schema, but Prisma doesn't strictly have to map everything if it's not in the insert object, and postgres schema.postgres.prisma does not match schema.prisma right now, wait actually googleApiKey is in schema.prisma, so it's fine.

        const user = await prisma.user.create({
            data: {
                universityEmail: userData.universityEmail,
                name: userData.name,
                username: userData.username,
                passwordHash: userData.passwordHash,
                role: userData.role,
                canvasApiToken: userData.canvasApiToken
                // Note: we let SQLite autoincrement ID because ID=1 is likely taken by 'testuser'
            }
        });

        console.log(`✅ Successfully injected ${user.username} with ID ${user.id} into dev.db!`);
        console.log(`You can now login locally using:`);
        console.log(`Username: ${user.username}`);
        console.log(`Password: (Whatever you normally use)`);
    } catch (error) {
        console.error('Error inserting user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
