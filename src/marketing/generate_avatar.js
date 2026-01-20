const { generateImage } = require('./designer');

async function main() {
    const prompt = "A photorealistic portrait of a steady middle-aged Asian man named 'Ah Quan', business casual attire, glasses, reviewing a detailed data report or spreadsheet in a modern office, warm lighting, trustworthy, professional consultant vibe, 8k resolution, cinematic quality";

    console.log("Generating Avatar for Ah Quan...");
    try {
        const url = await generateImage(prompt);
        console.log("AVATAR_URL: " + url);
        require('fs').writeFileSync('avatar_url.txt', url);
    } catch (e) {
        console.error("Error: " + e.message);
    }
}

main();
