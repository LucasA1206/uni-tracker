const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function checkFile(filename) {
    const filePath = path.join(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
        console.log(`Found ${filename}`);
        const envConfig = dotenv.parse(fs.readFileSync(filePath));
        const keys = Object.keys(envConfig);
        console.log(`Keys in ${filename}:`, keys.join(', '));
        return keys;
    } else {
        console.log(`${filename} not found.`);
        return [];
    }
}

console.log('--- Checking Environment Variables ---');
checkFile('.env');
checkFile('.env.local');
