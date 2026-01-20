const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const TABLE_NAME = "【主看板】客服任务流水线";

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function getPipelineTableId(token) {
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const table = res.data.data.items.find(t => t.name === TABLE_NAME);
    return table ? table.table_id : null;
}

async function addStartDateField(token, tableId) {
    console.log('Ensure "开始时间" field exists...');
    try {
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/fields`, {
            field_name: "开始时间",
            type: 5 // Date
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log('✅ Field "开始时间" Created.');
    } catch (e) {
        // Ignore if exists
    }
}

async function updateRecordsForGantt(token, tableId) {
    console.log('Updating records with timelines...');
    // List records
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.data.code !== 0) return;

    const records = res.data.data.items;
    const now = Date.now();
    const oneHour = 3600 * 1000;

    // Timeline Strategy: Stagger tasks to look like a flow
    // Task 1: 09:00 - 10:00
    // Task 2: 10:00 - 12:00
    // Task 3: 13:00 - 14:00

    let offset = 0;

    for (const rec of records) {
        const title = rec.fields["任务标题"] || "";
        // Only update our demo tasks
        if (title.includes("【") || title.includes("[") || title.includes("🟢") || title.includes("🟡") || title.includes("🔵") || title.includes("✅")) {

            const start = now + offset;
            const end = start + (2 * oneHour); // 2 hours duration

            await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records/${rec.record_id}`, {
                fields: {
                    "开始时间": start,
                    "截止时间": end
                }
            }, { headers: { 'Authorization': `Bearer ${token}` } });

            console.log(`  Updated timeline for: ${title}`);
            offset += (2.5 * oneHour); // Next task starts after this one finishes
        }
    }
}

async function main() {
    const token = await getAccessToken();
    const tableId = await getPipelineTableId(token);
    if (!tableId) {
        console.error('Table not found!');
        return;
    }

    await addStartDateField(token, tableId);
    await updateRecordsForGantt(token, tableId);
    console.log('🎉 Gantt Data Ready!');
}

main();
