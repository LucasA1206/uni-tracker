const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
    const connectionString = "postgres://86baf6a2fbbb08f5fdc54f57398ba3cc8949bb09d269a4acfe059104917553fd:sk_6VAQOwPLtCrTKIbMe8LdR@db.prisma.io:5432/postgres?sslmode=require";
    const client = new Client({ connectionString });

    const newPassword = "Password123!";
    const hash = bcrypt.hashSync(newPassword, 10);

    try {
        await client.connect();

        // Check user exists first
        const res = await client.query('SELECT id, username FROM "User" WHERE username = $1', ['LucasA001']);
        if (res.rows.length === 0) {
            console.log('User not found!');
            return;
        }

        // Update password
        await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE username = $2', [hash, 'LucasA001']);
        console.log(`Successfully updated password for LucasA001 in production DB to: ${newPassword}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
