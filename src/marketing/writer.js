const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const fs = require('fs-extra');
const OpenAI = require('openai');
const { exec } = require('child_process');

const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
});

const DATA_DIR = path.join(__dirname, '../../data');
const OUTPUT_DIR = path.join(__dirname, '../../output');
const STYLE_DIR = path.join(__dirname, '../../style_references');
const TOPICS_FILE = path.join(DATA_DIR, 'selected_topics.json');

function updateConsole(progress, log) {
    // const cmd = `python ../07-antigravity-console/task_manager.py update --progress ${progress} --log "${log}"`;
    // exec(cmd, { cwd: 'C:\\01-工作区' }, (e) => { if (e) console.error(e) });
    console.log(`[Progress ${progress}%] ${log}`);
}

async function loadStyles() {
    const files = await fs.readdir(STYLE_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    console.log(`Found ${txtFiles.length} style files.`);
    updateConsole(20, `Loaded ${txtFiles.length} style references.`);

    let combinedStyle = "";
    for (const f of txtFiles) {
        const content = await fs.readFile(path.join(STYLE_DIR, f), 'utf-8');
        // Take first 500 chars as sample to avoid token limit overflow if too many
        combinedStyle += `\n--- Sample from ${f} ---\n${content.substring(0, 800)}...\n`;
    }
    return combinedStyle;
}

async function writeArticle(topic, styleContext) {
    console.log(`Writing article for: ${topic.title}`);
    updateConsole(50, `Writing: ${topic.title}...`);

    const prompt = `
    你是一个专业的新闻主编。请参考以下【范文风格】，针对话题【${topic.title}】写一篇深度文章。
    
    【排版要求 - 必须严格遵守】
    1. **结构化输出**：文章必须包含两个部分。
       - 第一部分：**【要闻提示】**（List 格式，3-4个核心看点，简练有力）
       - 第二部分：**【深度解读】**（正文，分 3 个小标题阐述）
    2. **Markdown 格式**：
       - 使用 \`##\` 标记大标题（如"要闻提示"、"深度解读"）
       - 使用 \`###\` 标记正文内的小标题
       - 使用 \`-\` 标记列表
    
    【写作要求】
    1. 标题：极具吸引力，类似公众号爆款标题（不超过20字）。
    2. 风格：理性、专业、有洞察力（参考路透社/财新风格）。
    3. 字数：800-1200字。
    
    【话题背景】
    ${topic.reason}
    `;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "deepseek-chat", // or deepseek-v3
        temperature: 0.8
    });

    return completion.choices[0].message.content;
}

async function main() {
    await fs.ensureDir(OUTPUT_DIR);

    try {
        const topics = await fs.readJson(TOPICS_FILE);
        const styleContext = await loadStyles();

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            const progress = 30 + Math.floor((i / topics.length) * 60);
            updateConsole(progress, `Processing ${i + 1}/${topics.length}: ${topic.title}`);

            const article = await writeArticle(topic, styleContext);

            // Save
            const safeTitle = topic.title.replace(/[\\/:*?"<>|]/g, '_');
            const filename = path.join(OUTPUT_DIR, `${safeTitle}.md`);
            await fs.writeFile(filename, article, 'utf-8');
            console.log(`Saved: ${filename}`);
        }

        updateConsole(100, "Writer Completed. 3 Articles Generated.");
        exec(`python ../07-antigravity-console/task_manager.py update --status "Done" --progress 100`, { cwd: 'C:\\01-工作区' });

    } catch (e) {
        console.error(e);
        updateConsole(0, "Error: Writer Failed");
        process.exit(1);
    }
}

main();
