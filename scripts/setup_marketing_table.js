const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const TABLE_NAME = "【运营】内容素材库";

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

// Helper to find table
async function findTable(token, name) {
    let hasMore = true;
    let pageToken = '';
    while (hasMore) {
        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            params: { page_token: pageToken },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.code === 0) {
            const t = res.data.data.items.find(x => x.name === name);
            if (t) return t.table_id;
            hasMore = res.data.data.has_more;
            pageToken = res.data.data.page_token;
        } else { hasMore = false; }
    }
    return null;
}

async function main() {
    const token = await getAccessToken();
    console.log(`Creating Marketing Table: ${TABLE_NAME}...`);

    let tid = await findTable(token, TABLE_NAME);
    if (!tid) {
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            table: { name: TABLE_NAME }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        tid = res.data.data.table_id;
    } else {
        console.log("Table already exists. Adding missing fields...");
    }

    // Define Fields
    const fields = [
        { name: "标题", type: 1 }, // Text
        { name: "正文内容", type: 1 }, // Long Text
        {
            name: "发布平台", type: 3, property: {
                options: [
                    { name: "微信公众号" },
                    { name: "小红书" },
                    { name: "知乎" },
                    { name: "视频号" } // Added based on user input
                ]
            }
        },
        {
            name: "发布状态", type: 3, property: {
                options: [
                    { name: "草稿" },
                    { name: "待发布" },
                    { name: "已发布" }
                ]
            }
        },
        { name: "素材附件", type: 17 }, // Attachment (Image/Video)
        { name: "发布链接", type: 1 } // Url
    ];

    for (const f of fields) {
        try {
            await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tid}/fields`, {
                field_name: f.name,
                type: f.type,
                property: f.property
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log(`  + Field Created: ${f.name}`);
        } catch (e) {
            // Ignore if exists
        }
    }

    console.log("✅ Marketing Table Ready.");
}

main().catch(console.error);
