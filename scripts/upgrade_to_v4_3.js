const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const TABLES = {
    BLUEPRINTS: "【业务】SOP蓝图库",
    PRODUCERS: "【供应链】技术员库",
    BIDDING: "【供应链】竞标记录",
    PRODUCTION: "【供应链】制作追踪",
    NOTIFICATIONS: "【风控】法务通知"
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

async function ensureTable(token, name) {
    let tid = await findTable(token, name);
    if (!tid) {
        console.log(`Creating Table: ${name}...`);
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            table: { name: name }
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        tid = res.data.data.table_id;
    }
    return tid;
}

async function addField(token, tableId, name, type, config = {}) {
    try {
        await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/fields`, {
            field_name: name,
            type: type,
            property: config
        }, { headers: { 'Authorization': `Bearer ${token}` } });
        console.log(`  + Field: ${name}`);
    } catch (e) {
        // Ignore duplicate
    }
}

async function main() {
    const token = await getAccessToken();
    console.log('🚀 Upgrading Database to V4.3 Specifications...');

    // 1. Blueprints
    const bpTid = await ensureTable(token, TABLES.BLUEPRINTS);
    await addField(token, bpTid, "标题", 1);
    await addField(token, bpTid, "蓝图JSON", 1);
    await addField(token, bpTid, "脱敏测试数据", 17); // Attachment

    // 2. Producers
    const devTid = await ensureTable(token, TABLES.PRODUCERS);
    await addField(token, devTid, "姓名", 1);
    await addField(token, devTid, "信誉分", 2);
    await addField(token, devTid, "当前状态", 3, { options: [{ name: "活跃" }, { name: "封禁" }] });

    // 3. Bidding
    const bidTid = await ensureTable(token, TABLES.BIDDING);
    await addField(token, bidTid, "关联订单", 1); // Should be link, simplified to text for now or link later
    await addField(token, bidTid, "关联技术员", 18, { table_id: devTid });
    await addField(token, bidTid, "报价金额", 2);
    await addField(token, bidTid, "是否中标", 7); // Checkbox

    // 4. Production
    const prodTid = await ensureTable(token, TABLES.PRODUCTION);
    await addField(token, prodTid, "关联订单", 1); // Link
    await addField(token, prodTid, "关联技术员", 18, { table_id: devTid });
    await addField(token, prodTid, "验收报告", 17); // Attachment
    await addField(token, prodTid, "质量评分", 2);

    // 5. Notifications
    const noteTid = await ensureTable(token, TABLES.NOTIFICATIONS);
    await addField(token, noteTid, "关联订单", 1);
    await addField(token, noteTid, "触达渠道", 3, { options: [{ name: "SMS" }, { name: "Email" }, { name: "Feishu" }] });
    await addField(token, noteTid, "用户行为", 3, { options: [{ name: "未读" }, { name: "已读" }, { name: "已点击" }] });

    console.log('✅ V4.3 Schema Upgrade Complete.');
}

main().catch(console.error);
