const { Client } = require('pg');

async function main() {
    const connectionString = process.env.POSTGRES_PRISMA_URL;
    if (!connectionString) {
        console.error("POSTGRES_PRISMA_URL is required.");
        process.exit(1);
    }

    const targetUsername = process.argv[2] || 'LucasA001'; // Default to LucasA001 if no arg

    const client = new Client({ connectionString });

    try {
        await client.connect();

        // Check if user exists
        const userRes = await client.query('SELECT id, username, "universityEmail", name, role FROM "User" WHERE username = $1 OR "universityEmail" = $1', [targetUsername]);
        const user = userRes.rows[0];

        if (!user) {
            console.log(`❌ User '${targetUsername}' not found in production database.`);
            console.log('\nAll users in database:');
            const allUsers = await client.query('SELECT id, username, "universityEmail", name FROM "User"');
            allUsers.rows.forEach(u => {
                console.log(`  - ${u.username} (${u.universityEmail}) - ID: ${u.id}`);
            });
            return;
        }

        console.log(`✅ Found user '${targetUsername}':`);
        console.log(JSON.stringify(user, null, 2));

        const userId = user.id;

        // Get user's data counts
        const [courses, assignments, notes, tasks, events] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM "UniCourse" WHERE "userId" = $1', [userId]),
            client.query('SELECT COUNT(*) as count FROM "Assignment" WHERE "courseId" IN (SELECT id FROM "UniCourse" WHERE "userId" = $1)', [userId]),
            client.query('SELECT COUNT(*) as count FROM "Note" WHERE "userId" = $1', [userId]),
            client.query('SELECT COUNT(*) as count FROM "WorkTask" WHERE "userId" = $1', [userId]),
            client.query('SELECT COUNT(*) as count FROM "CalendarEvent" WHERE "userId" = $1', [userId])
        ]);

        console.log(`\n📊 Data summary for user ${targetUsername}:`);
        console.log(`  - Courses: ${courses.rows[0].count}`);
        console.log(`  - Assignments: ${assignments.rows[0].count}`);
        console.log(`  - Notes: ${notes.rows[0].count}`);
        console.log(`  - Work Tasks: ${tasks.rows[0].count}`);
        console.log(`  - Calendar Events: ${events.rows[0].count}`);

    } catch (err) {
        console.error('Database error:', err);
    } finally {
        await client.end();
    }
}

main();