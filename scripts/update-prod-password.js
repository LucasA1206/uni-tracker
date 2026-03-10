const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL environment variable is required.");
        process.exit(1);
    }
    const client = new Client({ connectionString });

    const newPassword = "Password123!";
    const hash = bcrypt.hashSync(newPassword, 10);

    try {
        await client.connect();

        // Check user exists first
        const res = await client.query('SELECT id, username FROM "User" WHERE username = $1', ['DemoUser1']);
        if (res.rows.length === 0) {
            console.log('User not found!');
            return;
        }

        // Update password
        await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE username = $2', [hash, 'DemoUser1']);
        console.log(`Successfully updated password for DemoUser1 in production DB to: ${newPassword}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
