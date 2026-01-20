const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const axios = require('axios');
const fs = require('fs-extra');
const OpenAI = require('openai');
const https = require('https');
// Keep rejectUnauthorized for good measure
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Init Clients
// Init Clients with Dummy Key fallback to prevent startup crash
const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.API_KEY;
const openai = new OpenAI({
    apiKey: deepseekKey || "sk-dummy-key-for-init",
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
});

// TianAPI Config (Fallback)
const TIANAPI_KEY = "1b79389ebd897769294d36cd4f6b356f";
const TIANAPI_URL = "https://apis.tianapi.com/toutiaohot/index";

// Paths
const DATA_DIR = path.join(__dirname, '../../data');
const TOPICS_FILE = path.join(DATA_DIR, 'selected_topics.json');

function updateConsole(progress, log) {
    console.log(`[PROGRESS ${progress}%] ${log}`);
}

async function fetchWeiboDirect() {
    console.log('Fetching Weibo Hot Search (Direct)...');
    try {
        const res = await axios.get('https://weibo.com/ajax/side/hotSearch', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Cookie': 'SUB=_2Ak_xyz'
            },
            timeout: 10000
        });
        const list = res.data.data.realtime || [];
        const items = list.map(item => ({
            title: item.note || item.word,
            url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.note || item.word)}`,
            heat: item.num,
            rank: 0
        })).filter(i => i.title);

        // Add fake ranks
        items.forEach((item, index) => item.rank = index + 1);

        console.log(`[Miner] Got ${items.length} topics from Weibo Direct.`);
        return items.slice(0, 20); // Return top 20
    } catch (e) {
        console.error(`[Miner] Weibo Direct Failed: ${e.message}`);
        return [];
    }
}

async function fetchTianAPIFallback() {
    console.log("Fetching Toutiao Hot Search (TianAPI) as fallback...");
    try {
        const response = await axios.post(TIANAPI_URL, new URLSearchParams({ key: TIANAPI_KEY }));
        const data = response.data;

        if (data.code !== 200) {
            throw new Error(`API Error: ${data.msg}`);
        }

        const topics = data.result.list.map((item, index) => ({
            rank: index + 1,
            title: item.word,
            hotValue: item.hotwordnum,
            url: ''
        }));

        console.log(`Found ${topics.length} topics from TianAPI.`);
        return topics;
    } catch (e) {
        console.error("TianAPI Fetch failed:", e.message);
        return [];
    }
}

async function filterTopics(topics) {
    if (topics.length === 0) return [];

    console.log("Filtering topics via DeepSeek...");
    const simpleList = topics.slice(0, 30).map(t => `${t.rank}. ${t.title}`).join('\n');

    const prompt = `
    你是一个热点选题主编。请从以下【热搜榜】中，挑选出 **3个** 最适合撰写“民生/文化/社会观察”深度文章的话题。
    
    要求：
    1. 话题必须具有广泛的社会讨论价值。
    2. 避免纯娱乐八卦、过于敏感的政治即时新闻。
    3. 侧重于：生活方式变迁、教育养老就业、社会心理。
    4. 返回 JSON 格式：{"topics": [{"rank": int, "title": "string", "reason": "string"}]}
    
    榜单：
    ${simpleList}
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "deepseek-chat",
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        console.log("DeepSeek Output:", content);

        let result = JSON.parse(content);
        const selected = Array.isArray(result) ? result : (result.topics || result.list || []);

        const finalSelection = selected.map(item => {
            const original = topics.find(t => t.title === item.title || t.rank == item.rank);
            return {
                ...item,
                hotValue: original ? original.hotValue : '0',
                full_title: item.title
            };
        });

        console.log("Selected:", finalSelection);
        updateConsole(80, `Selected ${finalSelection.length} topics.`);
        return finalSelection;

    } catch (e) {
        console.error("AI Filtering failed:", e);
        // Fallback: Pick top 3
        return topics.slice(0, 3).map(t => ({ ...t, reason: "Fallback selection" }));
    }
}

async function main() {
    await fs.ensureDir(DATA_DIR);
    try {
        // 1. Fetch
        let allTopics = await fetchWeiboDirect();
        if (allTopics.length === 0) {
            allTopics = await fetchTianAPIFallback();
        }

        if (allTopics.length === 0) {
            console.error("Critical: No topics found from any source.");
            process.exit(1);
        }

        // 2. Filter
        const selected = await filterTopics(allTopics);

        // 3. Save
        await fs.writeJson(TOPICS_FILE, selected, { spaces: 2 });
        console.log(`Saved to ${TOPICS_FILE}`);
        updateConsole(100, "Mining Completed.");
    } catch (e) {
        console.error("Main Failed:", e);
        process.exit(1);
    }
}

main();
