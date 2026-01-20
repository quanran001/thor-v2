const http = require('http');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const PORT = 3001; // Use 3001 to avoid conflict with Next.js default 3000
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

// --- Minimal Bot Logic ---
async function askDeepSeek(userMsg) {
    try {
        const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "你是一个专业的闲鱼客服助手(SoleBot)。请用简短、亲切、转化的语气回复客户。如果客户询问SOP或自动化服务，请引导他们下单。你的目标是促成交易。" },
                    { role: "user", content: userMsg }
                ],
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("DeepSeek Error:", error.message);
        return "抱歉，我这边网络有点卡，请稍等一下~";
    }
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const userMsg = data.message || "";
                console.log(`[Server] Received: ${userMsg}`);

                // Call Brain
                const reply = await askDeepSeek(userMsg);
                console.log(`[Server] Thinking: ${reply}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply: reply }));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    } else {
        res.writeHead(404);
        res.end("Not Found");
    }
});

server.listen(PORT, () => {
    console.log(`\n🤖 Bot Server (Brain) is running on http://localhost:${PORT}`);
    console.log(`👉 Endpoint: POST /api/chat`);
});
