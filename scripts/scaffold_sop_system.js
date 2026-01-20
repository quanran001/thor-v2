const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

// Schema Definitions based on User Instructions
const TABLES = {
    CHANNELS: {
        name: "【数据字典】渠道与客服",
        fields: [
            { name: "渠道名称", type: 3, options: ["淘宝", "索尔Web", "闲鱼"] }, // Select
            { name: "客服模块", type: 1 }, // Text
            { name: "负责人", type: 11 }   // User
        ]
    },
    RESOURCES: {
        name: "【数据字典】数据资源库",
        fields: [
            { name: "资源类型", type: 3, options: ["订单记录", "沟通日志", "卡密", "标准话术"] },
            { name: "资源内容_ID", type: 1 },
            { name: "状态", type: 3, options: ["可用", "已使用", "已下发"] }
        ]
    },
    USERS: {
        name: "【数据字典】用户与入口",
        fields: [
            { name: "用户来源", type: 3, options: ["全网用户", "闲鱼用户"] },
            { name: "访问入口", type: 1 }, // Text/URL
            // Link to Channels will be added dynamically
        ]
    },
    PIPELINE: {
        name: "【主看板】客服任务流水线",
        fields: [
            { name: "任务标题", type: 1 },
            // Links added dynamically
            { name: "当前状态", type: 3, options: ["待接入", "同步数据中", "待下发资源", "交付执行中", "已完成"] },
            { name: "负责人", type: 11 },
            { name: "截止时间", type: 5 },
            { name: "详细记录", type: 1 }
        ]
    }
};

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

// Helper to delay (avoid rate limits)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createTable(token, tableName) {
    console.log(`Creating Table: ${tableName}...`);
    const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
        table: { name: tableName }
    }, { headers: { 'Authorization': `Bearer ${token}` } });

    if (res.data.code === 0) {
        return res.data.data.table_id;
    } else {
        throw new Error(`Failed to create table ${tableName}: ${res.data.msg}`);
    }
}

async function addField(token, tableId, fieldDef) {
    console.log(`  + Adding Field: ${fieldDef.name}`);
    const payload = {
        field_name: fieldDef.name,
        type: fieldDef.type
    };

    // Configuration for Select Options
    if (fieldDef.options) {
        payload.property = {
            options: fieldDef.options.map(opt => ({ name: opt }))
        };
    }

    // Configuration for Link Fields
    if (fieldDef.linkTableId) {
        payload.property = {
            table_id: fieldDef.linkTableId,
            multiple: false
        };
    }

    const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/fields`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.data.code !== 0) {
        console.error(`  ❌ Error adding field ${fieldDef.name}: ${res.data.msg}`);
    }
}

async function scaffoldSystem() {
    try {
        const token = await getAccessToken();

        // 1. Create Base Tables
        const channelTableId = await createTable(token, TABLES.CHANNELS.name);
        for (const f of TABLES.CHANNELS.fields) await addField(token, channelTableId, f);
        console.log(`✅ Channels Table Ready: ${channelTableId}\n`);
        await sleep(1000);

        const resourceTableId = await createTable(token, TABLES.RESOURCES.name);
        for (const f of TABLES.RESOURCES.fields) await addField(token, resourceTableId, f);
        console.log(`✅ Resources Table Ready: ${resourceTableId}\n`);
        await sleep(1000);

        const userTableId = await createTable(token, TABLES.USERS.name);
        for (const f of TABLES.USERS.fields) await addField(token, userTableId, f);
        // Add Link to Channels
        await addField(token, userTableId, { name: "关联渠道", type: 18, linkTableId: channelTableId });
        console.log(`✅ Users Table Ready: ${userTableId}\n`);
        await sleep(1000);

        // 2. Create Core Pipeline Table
        const pipelineTableId = await createTable(token, TABLES.PIPELINE.name);
        for (const f of TABLES.PIPELINE.fields) await addField(token, pipelineTableId, f);

        // Add Links for Core Table
        await addField(token, pipelineTableId, { name: "关联渠道", type: 18, linkTableId: channelTableId });
        await addField(token, pipelineTableId, { name: "关联用户", type: 18, linkTableId: userTableId });
        await addField(token, pipelineTableId, { name: "所需资源", type: 18, linkTableId: resourceTableId });

        console.log(`✅ Pipeline Table Ready: ${pipelineTableId}\n`);

        console.log('🎉 SYSTEM SCAFFOLDING COMPLETE!');
        console.log('Next Step: Manually create a "Kanban View" in the Pipeline table grouped by "当前状态".');

    } catch (e) {
        console.error('Process Failed:', e.message);
    }
}

scaffoldSystem();
