const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const CONTENT_DIR = path.join(__dirname, '../../05-wechat-pro/output');
const TABLE_NAME = "【运营】内容素材库";

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function getTableId(token) {
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const table = res.data.data.items.find(t => t.name === TABLE_NAME);
    if (!table) throw new Error(`Table ${TABLE_NAME} not found`);
    return table.table_id;
}

async function syncContent() {
    console.log(`🚀 Starting Content Sync: Local -> Feishu...`);
    const token = await getAccessToken();
    const tableId = await getTableId(token);

    // 1. Read Local Files
    await fs.ensureDir(CONTENT_DIR);
    const files = await fs.readdir(CONTENT_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
        console.log("No markdown files found to sync.");
        return;
    }

    console.log(`📂 Found ${mdFiles.length} articles.`);

    // 2. Fetch Existing Records to prevent duplicates
    const existRes = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const existingTitles = new Set(existRes.data.data.items?.map(i => i.fields["标题"]) || []);

    // 3. Process & Upload
    for (const file of mdFiles) {
        const title = file.replace('.md', '').replace(/_/g, ' '); // Simple cleanup

        if (existingTitles.has(title)) {
            console.log(`⏭️  Skipping existing: ${title}`);
            continue;
        }

        const content = await fs.readFile(path.join(CONTENT_DIR, file), 'utf-8');

        // Insert
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
            fields: {
                "标题": title,
                "正文内容": content.substring(0, 3000), // Safety clip (though text can be long)
                "发布平台": "微信公众号", // Default tag
                "发布状态": "草稿"
            }
        }, { headers: { 'Authorization': `Bearer ${token}` } });

        console.log(`✅ Synced: ${title}`);
    }

    console.log(`🎉 Sync Complete.`);
}

syncContent().catch(console.error);
