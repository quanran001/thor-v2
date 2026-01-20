
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import OpenAI from 'openai';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const THOR_API_URL = 'http://localhost:3000/api/sop/generate';
const SCENARIOS_DIR = path.resolve(process.cwd(), 'tests/scenarios');
const REPORTS_DIR = path.resolve(process.cwd(), 'tests/reports');
const MAX_TURNS = 8; // Avoid infinite loops

interface Scenario {
    id: string;
    name: string;
    persona: string;
    style?: string; // e.g. "professional", "messy", "confused"
    initial_message: string;
    knowledge_base: any;
}

const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
});

// Helper: Simulated User Logic
async function getSimUserResponse(scenario: Scenario, history: any[]) {
    const styleInstruction = scenario.style === 'messy'
        ? "特征：你的打字习惯很差，经常有错别字（如同音字），标点符号乱用（比如全是空格），说话逻辑偶尔跳跃，甚至会夹杂一句无关的废话（如‘稍等接个电话’）。"
        : "特征：回答简洁明了，专业。";

    const systemPrompt = `
    核心身份: ${scenario.persona}
    说话风格: ${styleInstruction}
    
    任务:
    1. 与作为流程顾问的 AI (Thor) 交互。
    2. Thor 会问你关于流程的细节。
    3. 根据【知识库】回答。如果知识库里没提到的，合理编造。
    4. 必须严格扮演上述“说话风格”。即使你说话乱，核心信息（如发送渠道）也要在两三轮内透露给 Thor，不要无限绕圈子。
    
    【知识库】
    ${JSON.stringify(scenario.knowledge_base, null, 2)}
    `;

    const completion = await client.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...history
        ],
        model: 'deepseek-chat',
        temperature: 0.7
    });

    return completion.choices[0].message.content || "...";
}

async function runTest() {
    console.log('🚀 Starting Thor Automated Testing Framework...\n');

    // 1. Load Scenarios
    const files = fs.readdirSync(SCENARIOS_DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${files.length} scenarios: ${files.join(', ')}\n`);

    let reportContent = `# Thor Automation Test Report\nDate: ${new Date().toLocaleString()}\n\n`;

    for (const file of files) {
        const scenarioConfig: Scenario = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, file), 'utf-8'));
        console.log(`▶️ Running Scenario: [${scenarioConfig.name}]`);

        reportContent += `## Scenario: ${scenarioConfig.name}\n\n`;

        let chatHistory: any[] = [];
        let turn = 0;
        let success = false;
        let lastUserMsg = scenarioConfig.initial_message;

        // Start Interaction Loop
        while (turn < MAX_TURNS) {
            turn++;
            process.stdout.write(`  Round ${turn}... `);

            // User speaks
            chatHistory.push({ role: 'user', content: lastUserMsg });
            reportContent += `**User**: ${lastUserMsg}\n\n`;

            // Thor speaks
            try {
                const res = await fetch(THOR_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: lastUserMsg,
                        history: chatHistory.slice(0, -1)
                    })
                });
                const thorRes: any = await res.json();

                // Log Thor
                console.log(`Thor: [${thorRes.type}]`);
                reportContent += `**Thor** [${thorRes.type}]: ${thorRes.message}\n\n`;

                chatHistory.push({ role: 'assistant', content: thorRes.message });

                // Check Success
                if (thorRes.type === 'sop') {
                    success = true;
                    reportContent += `> ✅ **SUCCESS**: Generated SOP Blueprint.\n`;
                    reportContent += `> **Title**: ${thorRes.sop_data?.title}\n`;
                    reportContent += `> **Steps**: ${thorRes.sop_data?.steps?.length}\n\n`;
                    console.log(`    ✅ SOP Generated! Title: ${thorRes.sop_data?.title}`);
                    break;
                }

                // Generate User Reply for verify next round
                lastUserMsg = await getSimUserResponse(scenarioConfig, chatHistory);

            } catch (e) {
                console.error('Error:', e);
                reportContent += `> ❌ **ERROR**: API Call Failed.\n\n`;
                break;
            }

            // Wait to be nice to API
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!success) {
            reportContent += `> ⚠️ **FAILED**: Max turns reached without SOP generation.\n\n`;
            console.log(`    ⚠️ Failed to generate SOP within ${MAX_TURNS} turns.`);
        }

        reportContent += `---\n\n`;
    }

    // Save Report
    const reportPath = path.join(REPORTS_DIR, `test_report_${Date.now()}.md`);
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 Report saved to: ${reportPath}`);
}

runTest();
