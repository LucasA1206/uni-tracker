const { Client } = require('pg');

async function main() {
    const connectionString = "postgres://86baf6a2fbbb08f5fdc54f57398ba3cc8949bb09d269a4acfe059104917553fd:sk_6VAQOwPLtCrTKIbMe8LdR@db.prisma.io:5432/postgres?sslmode=require";

    const client = new Client({
        connectionString,
    });

    try {
        console.log('Connecting to Vercel Postgres...');
        await client.connect();
        console.log('Connected directly to Postgres.');

        const username = 'LucasA001';
        const altUsername = 'LucasA01';

        // Check user
        const res = await client.query('SELECT * FROM "User" WHERE username = $1 OR username = $2', [username, altUsername]);

        if (res.rows.length === 0) {
            console.log(`❌ User '${username}' nor '${altUsername}' found in Postgres!`);
            const allUsers = await client.query('SELECT id, username FROM "User"');
            console.log(`Found ${allUsers.rows.length} total users in DB:`);
            allUsers.rows.forEach(u => console.log(`  - ${u.username} (ID: ${u.id})`));
            return;
        }

        const user = res.rows[0];
        console.log(`\n✅ User '${user.username}' found! (ID: ${user.id}, Email: ${user.universityEmail}, Name: ${user.name})`);

        // Check notes
        const notesRes = await client.query('SELECT * FROM "Note" WHERE "userId" = $1', [user.id]);
        console.log(`\n--- NOTES (${notesRes.rows.length}) ---`);
        for (let i = 0; i < notesRes.rows.length; i++) {
            const note = notesRes.rows[i];
            const attachRes = await client.query('SELECT * FROM "NoteAttachment" WHERE "noteId" = $1', [note.id]);

            let attachmentDetails = attachRes.rows.map(a => `${a.name} (${a.type})`).join(', ');
            console.log(`  ${i + 1}. ${note.title}`);
            if (attachRes.rows.length > 0) {
                console.log(`     Attachments (${attachRes.rows.length}): ${attachmentDetails}`);
            }
        }

        // Checking courses and tasks
        const coursesRes = await client.query('SELECT * FROM "UniCourse" WHERE "userId" = $1', [user.id]);
        const tasksRes = await client.query('SELECT * FROM "WorkTask" WHERE "userId" = $1', [user.id]);

        console.log(`\n--- OTHER DATA ---`);
        console.log(`  🎓 Courses: ${coursesRes.rows.length}`);
        console.log(`  ☑️ Tasks: ${tasksRes.rows.length}`);

    } catch (err) {
        console.error('Database connection or query error:', err);
    } finally {
        await client.end();
    }
}

main();
