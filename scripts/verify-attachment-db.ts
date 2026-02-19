import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function main() {
    console.log('Testing attachment storage...');

    // 1. Find or create a user
    let user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found, creating one...');
        user = await prisma.user.create({
            data: {
                universityEmail: 'test@example.com',
                name: 'Test User',
                username: 'testuser',
                passwordHash: 'hash',
                role: 'user'
            }
        });
    }

    let note = await prisma.note.findFirst({ where: { userId: user.id } });
    if (!note) {
        console.log('No note found, creating one...');
        note = await prisma.note.create({
            data: {
                userId: user.id,
                title: 'Test Note',
                content: 'Test Content'
            }
        });
    }

    // 2. Create a dummy attachment directly (simulating what the API does)
    const buffer = Buffer.from('Hello World from Database Storage!');
    const attachment = await prisma.noteAttachment.create({
        data: {
            noteId: note.id,
            name: 'test.txt',
            type: 'text/plain',
            size: buffer.length,
            content: buffer,
            url: 'temp'
        }
    });

    // 3. Update URL (as per API logic)
    const publicUrl = `/api/attachments/${attachment.id}`;
    await prisma.noteAttachment.update({
        where: { id: attachment.id },
        data: { url: publicUrl }
    });

    console.log(`Created attachment ID: ${attachment.id}`);

    // 4. Retrieve and verify content
    const retrieved = await prisma.noteAttachment.findUnique({
        where: { id: attachment.id }
    });

    if (retrieved && retrieved.content) {
        const contentStr = Buffer.from(retrieved.content).toString();
        console.log('Retrieved content string:', contentStr);
        if (contentStr === 'Hello World from Database Storage!') {
            console.log('SUCCESS: Content retrieved correctly from database!');
        } else {
            console.error('FAILURE: Content mismatch.');
            process.exit(1);
        }
    } else {
        console.error('FAILURE: Content is null or attachment not found. Retrieved:', JSON.stringify(retrieved, null, 2));
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
