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
    return table.table_id;
}

async function moveTasksTo2025(token, tableId) {
    console.log('Moving tasks to 2025-11 (Target View)...');

    // List records
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // Target: Nov 15, 2025
    let baseTime = new Date('2025-11-15T09:00:00').getTime();
    const oneHour = 3600 * 1000;

    for (const rec of res.data.data.items) {
        // Update ALL records to ensure visibility
        const start = baseTime;
        const end = start + (4 * oneHour); // 4 hours long

        await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records/${rec.record_id}`, {
            fields: {
                "开始时间": start, // Timestamp
                "截止时间": end
            }
        }, { headers: { 'Authorization': `Bearer ${token}` } });

        console.log(`  Moved record ${rec.record_id} to 2025-11-15`);
        baseTime += (5 * oneHour); // Stagger them
    }
}

async function main() {
    try {
        const token = await getAccessToken();
        const tableId = await getPipelineTableId(token);
        await moveTasksTo2025(token, tableId);
        console.log('✅ Tasks Moved Successfully!');
    } catch (e) {
        console.error(e.message);
    }
}

main();
