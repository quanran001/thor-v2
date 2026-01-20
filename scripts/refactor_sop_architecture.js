const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

// New Schema Definitions
const NEW_TABLES = {
    ASSETS: { name: "【资产】卡密话术库" },
    ORDERS: { name: "【日志】订单记录" },
    CHATS: { name: "【日志】沟通流水" },
    CONFIG: { name: "【配置】机器人设置" }
};

const OLD_TABLES = {
    USERS: "【数据字典】用户与入口",
    PIPELINE: "【主看板】客服任务流水线"
};

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
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

async function createTable(token, name) {
    // Check exist
    const exist = await findTable(token, name);
    if (exist) return exist;

    console.log(`Creating Table: ${name}...`);
    const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
        table: { name: name }
    }, { headers: { 'Authorization': `Bearer ${token}` } });
    return res.data.data.table_id;
}

async function addField(token, tableId, name, type, config = {}) {
    console.log(`  + Adding Field: ${name}`);
    const payload = { field_name: name, type: type, property: config };
    try {
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/fields`, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        // Ignore duplicate field errors
    }
}

async function main() {
    const token = await getAccessToken();
    console.log('🚀 Starting Architecture Refactor v3.1...');

    // 1. Create New Split Tables
    const assetTid = await createTable(token, NEW_TABLES.ASSETS.name);
    await addField(token, assetTid, "内容", 1);
    await addField(token, assetTid, "类型", 3, { options: [{ name: "卡密" }, { name: "话术" }] });
    await addField(token, assetTid, "状态", 3, { options: [{ name: "可用" }, { name: "已用" }] });

    const orderTid = await createTable(token, NEW_TABLES.ORDERS.name);
    await addField(token, orderTid, "订单号", 1);
    await addField(token, orderTid, "金额", 2); // Number
    await addField(token, orderTid, "商品名", 1);

    const chatTid = await createTable(token, NEW_TABLES.CHATS.name);
    await addField(token, chatTid, "会话ID", 1);
    await addField(token, chatTid, "聊天内容", 1); // Long text
    await addField(token, chatTid, "时间戳", 5); // Date

    const configTid = await createTable(token, NEW_TABLES.CONFIG.name);
    await addField(token, configTid, "Agent Name", 1);
    await addField(token, configTid, "API Endpoint", 1);
    await addField(token, configTid, "Token", 1);

    // 2. Enhance User Table
    console.log('Enhancing User Table...');
    const userTid = await findTable(token, OLD_TABLES.USERS);
    if (userTid) {
        await addField(token, userTid, "User_UID", 1); // The Critical Missing Link
        console.log('✅ User UID field added.');
    }

    // 3. Re-Link Pipeline
    console.log('Updating Pipeline Links...');
    const pipeTid = await findTable(token, OLD_TABLES.PIPELINE);
    if (pipeTid) {
        await addField(token, pipeTid, "关联订单", 18, { table_id: orderTid });
        await addField(token, pipeTid, "关联沟通", 18, { table_id: chatTid });
        await addField(token, pipeTid, "关联资产", 18, { table_id: assetTid });
        console.log('✅ Pipeline linked to new architecture.');
    }

    console.log('🎉 Refactor Complete! Check Feishu for new structure.');
}

main().catch(e => console.error(e));
