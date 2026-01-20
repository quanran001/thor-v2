const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const TABLE_NAMES = {
    CHANNELS: "【数据字典】渠道与客服",
    RESOURCES: "【数据字典】数据资源库",
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

async function getTableMap(token) {
    const map = {};
    let hasMore = true;
    let pageToken = '';

    while (hasMore) {
        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            params: { page_token: pageToken },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            res.data.data.items.forEach(t => {
                map[t.name] = t.table_id;
            });
            hasMore = res.data.data.has_more;
            pageToken = res.data.data.page_token;
        } else {
            hasMore = false;
        }
    }
    return map;
}

async function createRecord(token, tableId, fields) {
    const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records`, {
        fields: fields
    }, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.data.code === 0) return res.data.data.record.record_id;
    console.error('Create Record Failed:', res.data.msg);
    return null;
}

async function seedData() {
    console.log('🌱 Seeding CRM Demo Data...');
    const token = await getAccessToken();
    const tables = await getTableMap(token);

    // 1. Seed Channels
    console.log('1. Seeding Channels...');
    const channelXY = await createRecord(token, tables[TABLE_NAMES.CHANNELS], {
        "渠道名称": "闲鱼",
        "客服模块": "XianyuAutoBot"
    });
    const channelSol = await createRecord(token, tables[TABLE_NAMES.CHANNELS], {
        "渠道名称": "索尔Web",
        "客服模块": "SoleWebAgent"
    });

    // 2. Seed Resources
    console.log('2. Seeding Resources...');
    const resOrder = await createRecord(token, tables[TABLE_NAMES.RESOURCES], {
        "资源类型": "订单记录",
        "资源内容_ID": "ORDER_20260114_888",
        "状态": "已使用"
    });
    const resCard = await createRecord(token, tables[TABLE_NAMES.RESOURCES], {
        "资源类型": "卡密",
        "资源内容_ID": "CARD_SVIP_001",
        "状态": "已下发"
    });

    // 3. Seed Users
    console.log('3. Seeding Users...');
    const userA = await createRecord(token, tables[TABLE_NAMES.USERS], {
        "用户来源": "闲鱼用户",
        "访问入口": "闲鱼APP-私聊",
        "关联渠道": [channelXY] // Link ID
    });
    const userB = await createRecord(token, tables[TABLE_NAMES.USERS], {
        "用户来源": "全网用户",
        "访问入口": "sop.wuyu.chat",
        "关联渠道": [channelSol]
    });

    // 4. Seed Pipeline Tasks (The Flow!)
    console.log('4. Seeding Pipeline Kanban...');

    // Task 1: New arrival
    await createRecord(token, tables[TABLE_NAMES.PIPELINE], {
        "任务标题": "🟢 [新客] 闲鱼用户咨询价格",
        "当前状态": "待接入",
        "关联用户": [userA],
        "关联渠道": [channelXY],
        "详细记录": "用户询问 SVIP 年卡价格。"
    });

    // Task 2: Syncing Links
    await createRecord(token, tables[TABLE_NAMES.PIPELINE], {
        "任务标题": "🟡 [处理中] 索尔用户订单匹配",
        "当前状态": "同步数据中",
        "关联用户": [userB],
        "关联渠道": [channelSol],
        "所需资源": [resOrder],
        "详细记录": "系统正在从 CRM 抓取订单信息..."
    });

    // Task 3: Delivering
    await createRecord(token, tables[TABLE_NAMES.PIPELINE], {
        "任务标题": "🔵 [交付] 闲鱼自动发货",
        "当前状态": "交付执行中",
        "关联用户": [userA],
        "所需资源": [resCard],
        "详细记录": "机器人正在发送卡密给用户。"
    });

    // Task 4: Done
    await createRecord(token, tables[TABLE_NAMES.PIPELINE], {
        "任务标题": "✅ [归档] 投诉处理完成",
        "当前状态": "已完成",
        "详细记录": "用户反馈已解决。"
    });

    console.log('🎉 Data Seeding Complete! Refresh your Feishu View.');
}

seedData();
