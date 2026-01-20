const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

// Table Names (New v3.1 Architecture)
const TABLES = {
    PIPELINE: "【主看板】客服任务流水线",
    USERS: "【数据字典】用户与入口",
    ASSETS: "【资产】卡密话术库",
    ORDERS: "【日志】订单记录",
    CHATS: "【日志】沟通流水"
};

// Simulation State
const USER_ID = "U_SIM_999";
const USER_NAME = "Simulated User (Alice)";
const ORDER_ID = "ORD_2026_SIM_001";
const CARD_CONTENT = "SVIP-CODE-XYZ-888";

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

// --- Agent Classes ---

class BaseClient {
    constructor(token) { this.token = token; this.tableIds = {}; }

    async init() {
        // Map Table Names to IDs
        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (res.data.code === 0) {
            res.data.data.items.forEach(t => { this.tableIds[t.name] = t.table_id; });
        }
    }

    async addRecord(tableName, fields) {
        const tid = this.tableIds[tableName];
        if (!tid) throw new Error(`Table ${tableName} not found`);
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tid}/records`, {
            fields: fields
        }, { headers: { 'Authorization': `Bearer ${this.token}` } });
        return res.data.data.record.record_id;
    }

    async findRecord(tableName, filterFn) {
        const tid = this.tableIds[tableName];
        if (!tid) return null;
        let hasMore = true;
        let pageToken = '';
        while (hasMore) {
            const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tid}/records`, {
                params: { page_token: pageToken },
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const items = res.data.data.items || [];
            const found = items.find(filterFn);
            if (found) return found;
            hasMore = res.data.data.has_more;
            pageToken = res.data.data.page_token;
        }
        return null;
    }

    async updateRecord(tableName, recordId, fields) {
        const tid = this.tableIds[tableName];
        await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tid}/records/${recordId}`, {
            fields: fields
        }, { headers: { 'Authorization': `Bearer ${this.token}` } });
    }
}

class UserAgent extends BaseClient {
    async enter() {
        console.log(`🧑‍💻 [User] Scanning QR Code... Entering System.`);
        // Check if I exist
        let me = await this.findRecord(TABLES.USERS, r => r.fields["User_UID"] === USER_ID);
        if (!me) {
            console.log(`🧑‍💻 [User] "Hi, I'm new!" (Registering)`);
            const rid = await this.addRecord(TABLES.USERS, {
                "User_UID": USER_ID,
                "用户来源": "闲鱼用户",
                "访问入口": "Simulation Script"
            });
            this.myRecordId = rid;
        } else {
            console.log(`🧑‍💻 [User] "I'm back!"`);
            this.myRecordId = me.record_id;
        }
    }

    async askQuestion(msg) {
        console.log(`🧑‍💻 [User] Sending Msg: "${msg}"`);
        // 1. Log to Chat
        await this.addRecord(TABLES.CHATS, {
            "会话ID": USER_ID + "_SESSION_1",
            "聊天内容": `[User]: ${msg}`,
            "时间戳": Date.now()
        });

        // 2. We assume the system/bot creates the Task. But here User simulates the trigger.
        return this.myRecordId;
    }

    async pay() {
        console.log(`🧑‍💻 [User] 💸 Paying Order 100 RMB...`);
        const num = Math.floor(Math.random() * 10000);
        const pid = await this.addRecord(TABLES.ORDERS, {
            "订单号": `PAY_${num}`,
            "金额": 100,
            "商品名": "Pro Plan Year"
        });
        return pid;
    }
}

class SoleBot extends BaseClient {
    // Logic: Universal Sole Agent (V5.0)
    // "One Brain, Any Channel"
    async conductFullConsultation(userRecordId) {
        console.log(`\n🤖 [Sole Agent] 🟢 Starting Standard Consultation Protocol (Channel: Xianyu)...`);

        // 1. Requirement Gathering
        console.log(`🤖 [Sole] "您好，我是索尔。请描述您的自动化需求。"`);
        console.log(`🧑‍💻 [User] "I need to auto-reply to customers on Xianyu."`);
        // Log
        await this.addRecord(TABLES.CHATS, { "会话ID": USER_ID, "聊天内容": "REQ: Auto-reply", "时间戳": Date.now() });

        // 2. Blueprint Generation (Internal)
        console.log(`🤖 [Sole] (Thinking) Analyzing feasibility... Generating Blueprint...`);
        // Create Blueprint Record
        const bpId = await this.addRecord("【业务】SOP蓝图库", {
            "标题": "Xianyu Auto-Reply Blueprint",
            "蓝图JSON": "{block: trigger_msg, block: reply_text}",
            // "用户ID": ... (Need linking)
        });
        console.log(`🤖 [Sole] Blueprint Generated. ID: ${bpId}`);

        // 3. Quoting
        console.log(`🤖 [Sole] "根据蓝图，预估为 L1 级难度 (低)。初步报价：¥199。"`);
        console.log(`🤖 [Sole] "请提供：1. 测试数据  2. 期望结果  3. 联系邮箱"`);

        // 4. User Provides Data
        console.log(`🧑‍💻 [User] "Here is my data and email: alice@example.com"`);

        // 5. Create Task (Now we enter the Pipeline)
        const tid = await this.addRecord(TABLES.PIPELINE, {
            "任务标题": "📝 [Xianyu] Auto-Reply Customization",
            "当前状态": "待支付", // Jump to payment for L1
            "截止时间": Date.now() + 3600000,
            "关联用户": [userRecordId]
        });
        this.currentTaskId = tid;
        console.log(`🤖 [Sole] Task Created in Pipeline. Ticket: ${tid}`);
    }

    async processOrder(orderRecordId) {
        console.log(`🤖 [Sole] Payment signal received. Syncing Order...`);
        // Link Order to Task
        // Update Task Status
        await this.updateRecord(TABLES.PIPELINE, this.currentTaskId, {
            "当前状态": "制作中", // Changed from Syncing to Brewing
            "关联订单": [orderRecordId]
        });
        console.log(`🤖 [Sole] Order Synced. Production Started...`);
    }

    async deliver() {
        // Simulate Production Delays
        // ...

        // Check Stock (Limit 5 Trial)
        // For simulation, we use Assets table
        const card = await this.findRecord(TABLES.ASSETS, r => r.fields["状态"] === "可用");

        if (!card) {
            console.error(`🚨 [Sole] NO LICENSE KEYS AVAILABLE!`);
            return;
        }

        console.log(`🤖 [Sole] Delivery: Sending 5-Use Trial Version...`);

        // 1. Mark as Used
        await this.updateRecord(TABLES.ASSETS, card.record_id, { "状态": "已用" });

        // 2. Send to Chat (Log)
        await this.addRecord(TABLES.CHATS, {
            "会话ID": USER_ID + "_SESSION_1",
            "聊天内容": `[Bot]: Trial Version Sent only to Email: alice@example.com`,
            "时间戳": Date.now()
        });

        // 3. Close Task
        await this.updateRecord(TABLES.PIPELINE, this.currentTaskId, {
            "当前状态": "交付试用",
            "关联资产": [card.record_id],
            "详细记录": "Trial Delivered."
        });
        console.log(`🤖 [Sole] Trial Delivery Complete. Entering 21-Day Monitor Mode.`);
    }
}

async function prepareStock(token, tables) {
    // Ensure at least one card
    const client = new BaseClient(token);
    await client.init();
    // Try to init Blueprint table if not exists (Lazy check)
    // ...

    const card = await client.findRecord(TABLES.ASSETS, r => r.fields["内容"] === CARD_CONTENT);
    if (!card) {
        console.log('🔧 [System] Restocking 1 Card for simulation...');
        await client.addRecord(TABLES.ASSETS, {
            "内容": CARD_CONTENT,
            "类型": "卡密",
            "状态": "可用"
        });
    }
}

async function runSimulation() {
    const token = await getAccessToken();
    console.log('🎬 STARTING SOP UNIFIED AGENT SIMULATION (V5.0) 🎬\n');

    await prepareStock(token);

    const Alice = new UserAgent(token);
    const Bot = new SoleBot(token); // Bot is now Sole Logic
    await Alice.init();
    await Bot.init();

    // Act 1: User Entry
    await Alice.enter();

    // Act 2: User Inquiry -> Sole Consultation Protocol (Same as Web)
    // This replaces the old "Ask -> Traffic Redirect" loop
    await Bot.conductFullConsultation(Alice.myRecordId);

    // Act 4: User Pay (Skipping Contract logic for L1 simulation)
    const orderRid = await Alice.pay();

    // Act 5: Bot Fulfillment
    await Bot.processOrder(orderRid);

    // Simulate delay
    console.log('... Antigravity Producing Skill ...');

    // Act 6: Delivery
    await Bot.deliver();

    console.log('\n✅ SIMULATION FINISHED. Unified Agent Logic Verified.');
}

runSimulation().catch(e => console.error(e));
