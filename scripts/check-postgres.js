const { PrismaClient } = require('../prisma/generated/postgres-client');

const prisma = new PrismaClient();

async function main() {
    const username = 'LucasA001';
    const altUsername = 'LucasA01';

    console.log(`Checking POSTGRES database for user: ${username} or ${altUsername}...`);

    let user = await prisma.user.findFirst({
        where: { username },
        include: {
            notes: {
                include: {
                    course: true,
                    attachments: true
                }
            },
            uniCourses: true,
            workTasks: true,
            events: true
        }
    });

    if (!user) {
        user = await prisma.user.findFirst({
            where: { username: altUsername },
            include: {
                notes: {
                    include: {
                        course: true,
                        attachments: true
                    }
                },
                uniCourses: true,
                workTasks: true,
                events: true
            }
        });
    }

    if (!user) {
        console.error(`❌ User '${username}' / '${altUsername}' not found in Postgres!`);
        const allUsers = await prisma.user.findMany({ select: { id: true, username: true } });
        console.log(`Found ${allUsers.length} total users in DB:`);
        allUsers.forEach(u => console.log(`  - ${u.username} (ID: ${u.id})`));
        return;
    }

    console.log(`\n✅ User '${user.username}' found! (ID: ${user.id}, Email: ${user.universityEmail}, Name: ${user.name})`);

    console.log(`\n--- NOTES (${user.notes.length}) ---`);
    user.notes.forEach((note, index) => {
        let attachmentDetails = note.attachments.map(a => `${a.name} (${a.type})`).join(', ');
        console.log(`  ${index + 1}. [${note.course ? note.course.code : 'No Course'}] ${note.title}`);
        if (note.attachments.length > 0) {
            console.log(`     Attachments (${note.attachments.length}): ${attachmentDetails}`);
        }
    });

    console.log(`\n--- OTHER DATA ---`);
    console.log(`  🎓 Courses: ${user.uniCourses.length}`);
    console.log(`  ☑️ Tasks: ${user.workTasks.length}`);
    console.log(`  📅 Events: ${user.events.length}`);
}

main()
    .catch((e) => {
        console.error("Error connecting to database or checking data:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
