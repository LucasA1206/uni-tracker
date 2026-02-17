
const fs = require('fs');
const path = require('path');

// Manually read .env file
const envPath = path.resolve(__dirname, '../.env');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (match) {
        apiKey = match[1];
    }
} catch (e) {
    console.error("Could not read .env file:", e.message);
}

if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env file or could not be parsed.");
    process.exit(1);
}

// console.log("Using API Key:", apiKey.substring(0, 5) + "...");

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(model => {
                // Filter for models that support generateContent
                if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${model.name}`);
                }
            });

            const flashModels = data.models.filter(m => m.name.includes('flash'));
            if (flashModels.length > 0) {
                console.log("\nFlash models specifically:");
                flashModels.forEach(m => console.log(`- ${m.name}`));
            }

        } else {
            console.log("No models found. Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
