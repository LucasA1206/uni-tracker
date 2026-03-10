const { Client } = require('pg');

async function main() {
    const connectionString = process.env.POSTGRES_PRISMA_URL;
    if (!connectionString) {
        console.error("POSTGRES_PRISMA_URL is required.");
        process.exit(1);
    }
    const client = new Client({ connectionString });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "User" WHERE username = $1', ['DemoUser1']);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
