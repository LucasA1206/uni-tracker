const { Client } = require('pg');

async function main() {
    const connectionString = "${POSTGRES_PRISMA_URL}";
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
