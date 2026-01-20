const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function auditSystem() {
    console.log('🕵️‍♂️ Auditing System against "SOP Blueprint v3.0"...');
    const token = await getAccessToken();

    // 1. Fetch Schema
    const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const tables = res.data.data.items;

    const tableMap = {};
    for (const t of tables) {
        const fields = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${t.table_id}/fields`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        tableMap[t.name] = fields.data.data.items.map(f => f.field_name);
    }

    const findings = [];

    // Check 1: User Identity (Critical for "Simulate Flow")
    // Diagram Flow: User -> Agent -> CRM. CRM needs to know WHO User is to merge records.
    const userTable = Object.keys(tableMap).find(n => n.includes("用户"));
    if (userTable) {
        const fields = tableMap[userTable];
        if (!fields.includes("用户唯一ID") && !fields.includes("OpenID") && !fields.includes("UID")) {
            findings.push("🔴 [CRITICAL] Missing 'User Unique ID' in User Table. System cannot dedup return users or link specific chat logs to users automatically.");
        }
    }

    // Check 2: Data Segregation (Blueprint shows distinct "Order Table" and "Log Table")
    // My Impl: "Data Resource Library"
    const resourceTable = Object.keys(tableMap).find(n => n.includes("资源"));
    if (resourceTable) {
        console.log(`\nAnalyzing Resource Table: ${resourceTable}`);
        // If we mix Orders (Dynamic) and Cards (Static), scaling issues occur.
        findings.push("🟡 [ARCH] 'Resources' table mixes Static Assets (Cards) with Dynamic Logs (Orders/Chats). Blueprint suggests distinct tables ('订单记录Table', '沟通日志Table'). Recommended to split.");
    }

    // Check 3: The "Pipeline" vs "Interaction"
    // Blueprint arrows: "Sync Chat/Order". 
    // Is Pipeline just a "Task List"? 
    const pipelineTable = Object.keys(tableMap).find(n => n.includes("流水线"));
    if (pipelineTable) {
        const fields = tableMap[pipelineTable];
        if (!fields.includes("触发源ID") && !fields.includes("MessageID")) {
            findings.push("🟡 [TRACE] Pipeline tasks lack 'Trace ID' (Trigger Source ID). Hard to map a specific Task back to the specific automated trigger event (e.g. Webhook Event ID).");
        }
    }

    // Check 4: Automation Binding
    // Agents (Xianyu/Sole) need API access.
    // Do we have an 'API Key' or 'Config' table for them?
    const configTable = Object.keys(tableMap).find(n => n.includes("配置") || n.includes("Config"));
    if (!configTable) {
        findings.push("⚪ [MISSING] No 'Agent Config' table found. Where do Xianyu/Sole bots get their credentials/prompts to talk to this Base?");
    }

    console.log('\n--- AUDIT REPORT ---');
    if (findings.length === 0) {
        console.log("✅ System perfectly matches Blueprint visual logic.");
    } else {
        findings.forEach(f => console.log(f));
    }
}

auditSystem();
