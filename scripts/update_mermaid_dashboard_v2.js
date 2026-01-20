const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const SOURCE_TABLE_NAME = "【主看板】客服任务流水线";
const DASHBOARD_TABLE_NAME = "【全局视图】流程仪表盘";

async function getAccessToken() {
    try {
        const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: APP_ID,
            app_secret: APP_SECRET
        });
        return res.data.tenant_access_token;
    } catch (e) {
        console.error('Auth Failed');
        process.exit(1);
    }
}

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
    console.log('Token acquired.');

    // 1. Locate Source
    const sourceTid = await findTable(token, SOURCE_TABLE_NAME);
    if (!sourceTid) {
        console.error(`Source table ${SOURCE_TABLE_NAME} not found!`);
        return;
    }

    // 2. Ensure Dashboard
    let dashTid = await findTable(token, DASHBOARD_TABLE_NAME);
    if (!dashTid) {
        console.log('Creating Dashboard Table...');
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            table: { name: DASHBOARD_TABLE_NAME }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        dashTid = res.data.data.table_id;

        // Add Field
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/fields`, {
            field_name: "Mermaid_Code",
            type: 1
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    } else {
        console.log('Dashboard Table Found:', dashTid);
    }

    // 3. Generate Diagram Data
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${sourceTid}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const tasks = res.data.data.items || [];

    // Grouping
    const groups = {};
    for (const t of tasks) {
        const status = t.fields["当前状态"] || "未分类";
        const title = t.fields["任务标题"] || "No Title";
        if (!groups[status]) groups[status] = [];
        groups[status].push(title);
    }

    // Build Mermaid
    let code = "graph TB\n";
    // Define ordering
    const flow = ["待接入", "同步数据中", "待下发资源", "交付执行中", "已完成"];

    flow.forEach(state => {
        code += `subgraph ${state}\n`;
        if (groups[state]) {
            groups[state].forEach(title => {
                const safeId = "id" + Math.floor(Math.random() * 10000); // Simple ID
                const cleanTitle = title.replace(/["\n]/g, "");
                code += `  ${safeId}["${cleanTitle}"]\n`;
            });
        } else {
            // Placeholder to ensure subgraph exists?
            // code += `  empty_${state}[ ]\n`;
        }
        code += `end\n`;
    });

    // 4. Update Dashboard
    const dashRecords = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (dashRecords.data.data.items && dashRecords.data.data.items.length > 0) {
        const rid = dashRecords.data.data.items[0].record_id;
        console.log(`Updating Record ${rid}...`);
        await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records/${rid}`, {
            fields: { "Mermaid_Code": code }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    } else {
        console.log('Creating New Dashboard Record...');
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records`, {
            fields: { "Mermaid_Code": code }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    }

    console.log('✅ Success! Mermaid Code is now in the Dashboard table.');
}

main().catch(err => console.error(err.message));
