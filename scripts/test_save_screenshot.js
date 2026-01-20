require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Mock process.env for the library if needed (though dotenv handles it)
// We need to implement the save logic inline to avoid import issues with TS modules in Node
// Or we can try to use the library if we compile it. 
// Safest: Re-implement the fetch logic here using the known Table ID.

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = 'tblU82LFwm0dZVAd'; // From lib/sops.ts

if (!APP_ID || !APP_SECRET || !BASE_TOKEN) {
    console.error("Missing env vars. Please check .env.local");
    process.exit(1);
}

async function getAccessToken() {
    console.log("Getting Access Token...");
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg);
    return data.tenant_access_token;
}

async function saveRecord() {
    try {
        const token = await getAccessToken();
        console.log("Token obtained.");

        // Data from Screenshot
        const sopData = {
            title: "周报汇总分发流程 (Weekly Report Standard)",
            summary: "各部门周报收集、汇总与分发的标准化流程",
            steps: [
                {
                    role: "各部门负责人 (Heads)",
                    action: "在统一模板中填写本周总结与下周计划",
                    standard: "每周五下午3-4点间，通过微信或邮箱提交"
                },
                {
                    role: "您 (汇总人)",
                    action: "1. 收集周报 2. 复制内容至总表 3. 检查格式",
                    standard: "内容完整、格式统一、无错漏"
                },
                {
                    role: "您 (分发人)",
                    action: "将汇总后的完整周报发送给领导及负责人",
                    standard: "每周五晚上前完成分发"
                }
            ],
            diagnosis: []
        };

        const userId = "user_test_screenshot_001";
        const blueprintId = `bp_${Date.now()}`;

        console.log("Saving record...");
        const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    "blueprint_id": blueprintId,
                    "user_id": userId,
                    "title": sopData.title,
                    "content_json": JSON.stringify(sopData),
                    "summary": sopData.summary,
                    "score_5d": 85,
                    "created_at": Date.now()
                }
            })
        });

        const result = await res.json();
        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.code === 0) {
            console.log("SUCCESS! Record Saved.");
        } else {
            console.error("FAILED to save record.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

saveRecord();
