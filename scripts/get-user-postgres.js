const { Client } = require('pg');

async function main() {
    const connectionString = "postgres://86baf6a2fbbb08f5fdc54f57398ba3cc8949bb09d269a4acfe059104917553fd:sk_6VAQOwPLtCrTKIbMe8LdR@db.prisma.io:5432/postgres?sslmode=require";
    const client = new Client({ connectionString });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "User" WHERE username = $1', ['LucasA001']);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
