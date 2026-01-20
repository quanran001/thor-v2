const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const SOURCE_TABLE = "【主看板】客服任务流水线";
const DASHBOARD_TABLE = "【全局视图】流程仪表盘";

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function getTableId(token, name) {
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

async function ensureDashboardTable(token) {
    let tid = await getTableId(token, DASHBOARD_TABLE);
    if (!tid) {
        console.log('Creating Dashboard Table...');
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            table: { name: DASHBOARD_TABLE }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        tid = res.data.data.table_id;

        // Add specific field for Mermaid
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tid}/fields`, {
            field_name: "Mermaid_Code",
            type: 1 // Text
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    }
    return tid;
}

async function generateMermaid(token) {
    const sourceTid = await getTableId(token, SOURCE_TABLE);
    const dashTid = await ensureDashboardTable(token);

    // 1. Fetch Tasks
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${sourceTid}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const tasks = res.data.data.items;

    // 2. Build Graph Logic
    // We will group by Status
    const statusMap = {
        "待接入": [],
        "同步数据中": [],
        "待下发资源": [],
        "交付执行中": [],
        "已完成": []
    };

    tasks.forEach(t => {
        const title = t.fields["任务标题"] || "Untitled";
        const status = t.fields["当前状态"] || "Unknown";
        if (statusMap[status]) {
            // Sanitize ID
            const safeId = "node_" + t.record_id.substring(0, 5);
            statusMap[status].push({ id: safeId, title: title.replace(/["\n]/g, '') });
        }
    });

    let graph = "graph LR\n";

    // Define Styles
    graph += "classDef pending fill:#fff,stroke:#333; \n";
    graph += "classDef processing fill:#e6f7ff,stroke:#1890ff; \n";
    graph += "classDef done fill:#f6ffed,stroke:#52c41a; \n";

    // Build Subgraphs
    const flow = ["待接入", "同步数据中", "待下发资源", "交付执行中", "已完成"];

    flow.forEach((state, index) => {
        graph += `subgraph ${state}\n`;
        graph += `  direction TB\n`; // Top-Bottom inside list
        statusMap[state].forEach(node => {
            let styleClass = "pending";
            if (state === "已完成") styleClass = "done";
            if (state === "同步数据中" || state === "交付执行中") styleClass = "processing";

            graph += `  ${node.id}["${node.title}"]:::${styleClass}\n`;
        });
        graph += `end\n`;

        // Connect subgraphs loosely to show flow
        if (index < flow.length - 1) {
            // graph += `${state} --> ${flow[index+1]}\n`; // Mermaid doesn't support subgraph connection directly often
        }
    });

    // Connect nodes linearly to simulate flow? 
    // Just visually chaining the subgraphs is usually implicit in LR

    console.log('Generated Mermaid:\n', graph);

    // 3. Write to Dashboard
    // Check if record exists
    const dashRes = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (dashRes.data.data.items.length > 0) {
        // Update first record
        await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records/${dashRes.data.data.items[0].record_id}`, {
            fields: { "Mermaid_Code": graph }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    } else {
        // Create
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${dashTid}/records`, {
            fields: { "Mermaid_Code": graph }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
    }

    console.log('✅ Dashboard Updated with Live Flowchart Code.');
}

generateMermaid(process.env.FEISHU_BASE_TOKEN).catch(e => console.error(e)); // Wait, token logic in main
// Refix calling
async function main() {
    const token = await getAccessToken();
    await generateMermaid(token);
}
main();
