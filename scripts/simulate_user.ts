
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import OpenAI from 'openai';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const THOR_API_URL = 'http://localhost:3000/api/sop/generate';
const MAX_TURNS = 10;

// The "Simulated User" Persona
const USER_PERSONA = `
你是一个忙碌的**财务专员**。
你的痛点：每个月月底都要处理几百张员工发来的报销发票，虽然现在很多是电子发票，但你还是得一张张打开邮件，把发票下载下来，然后把发票里的“金额”、“税号”、“日期”录入到公司的 Excel 大表里。
技术水平：小白，不懂代码，听说过“自动化”但不知道怎么做。

任务目标：
1. 向对方（索尔）抱怨这个繁琐的工作。
2. 当对方追问细节时（比如问你发票怎么来的，怎么处理的），你要根据以下设定如实回答：
   - 来源：员工把 PDF 电子发票发到我的 corporate_finance@company.com 邮箱。
   - 格式：主要是 PDF，偶尔有图片。
   - 处理逻辑：我要提取里面的【发票代码】、【金额】、【开票日期】，填到 "2024报销汇总.xlsx" 里。
   - 输出：把 Excel 做好就行，发给财务总监归档。
3. 你的回答要简短自然，像在微信聊天一样。
`;

async function runSimulation() {
    console.log('🚀 启动模拟测试：财务报销自动化场景...\n');

    const client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
    });

    let chatHistory: any[] = [];
    let turnCount = 0;

    // Initial Trigger
    let lastUserMessage = "你好，我快被每个月的发票报销折磨疯了，能不能帮帮我？";

    while (turnCount < MAX_TURNS) {
        turnCount++;
        console.log(`\n---------------- [Round ${turnCount}] ----------------`);

        // 1. Simulate User sending message to Thor
        console.log(`👤 模拟用户 (Finance): ${lastUserMessage}`);

        // Add to history
        chatHistory.push({ role: 'user', content: lastUserMessage });

        // 2. Call Thor API
        try {
            const res = await fetch(THOR_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: lastUserMessage,
                    history: chatHistory.slice(0, -1) // Don't allow Thor to see the newest user msg in history twice, logic is strictly msg + history
                })
            });

            const thorResponse: any = await res.json();

            // Print Thor's Reply
            console.log(`⚡ 索尔 (Thor): [${thorResponse.type}]`);
            console.log(thorResponse.message);

            if (thorResponse.type === 'sop') {
                console.log('\n🎉 测试成功！索尔生成了 SOP 蓝图！');
                console.log('📜 蓝图标题:', thorResponse.sop_data.title);
                console.log('🧩 步骤数量:', thorResponse.sop_data.steps.length);
                console.log('📊 核心诊断:', JSON.stringify(thorResponse.sop_data.diagnosis, null, 2));
                break;
            }

            // Add Thor's reply to history
            chatHistory.push({ role: 'assistant', content: thorResponse.message });

            // 3. Simulated User thinks of a reply
            const completion = await client.chat.completions.create({
                messages: [
                    { role: 'system', content: USER_PERSONA },
                    ...chatHistory, // User persona sees full history
                ],
                model: 'deepseek-chat',
            });

            lastUserMessage = completion.choices[0].message.content || "...";

        } catch (error) {
            console.error('❌ Error calling Thor:', error);
            break;
        }

        // Safety break
        if (turnCount >= MAX_TURNS) {
            console.log('\n⚠️ 达到最大轮数，测试结束。索尔可能未能完成引导。');
        }

        // Wait a bit to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
    }
}

runSimulation();
