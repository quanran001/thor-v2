const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

// Full v3.0 Content Definitions
const DIAGRAM_OVERVIEW = `graph TD
    Feishu[(🧠 飞书 CRM 中台)]
    Xianyu[📱 闲鱼机器人]
    Sol[🌐 索尔 Web客服]
    Xianyu <-->|"双向同步(订单/会话)"| Feishu
    Sol <-->|"双向同步(订单/会话)"| Feishu
    classDef brain fill:#00d6b9,stroke:#333,stroke-width:2px,color:white;
    classDef agent fill:#ff9900,stroke:#333,stroke-width:2px,color:white;
    class Feishu brain;
    class Xianyu,Sol agent;`;

const DIAGRAM_XIANYU = `graph LR
    User(用户) --> Agent(机器人)
    Agent -- "1.识别意图" --> SOP(风控/逻辑)
    SOP -- "2.读写数据" --> DB[(飞书表格)]
    DB -- "3.返回卡密" --> SOP
    SOP --> Agent --> User`;

const DIAGRAM_SOL = `graph LR
    User(全网用户) --> Link(sop.wuyu.chat)
    Link --> Sol(索尔客服)
    Sol -- "1.鉴权" --> DB[(飞书表格)]
    DB -- "2.发货" --> Sol --> User`;

async function createDoc() {
    try {
        const token = await getAccessToken();
        console.log('Creating Feishu DocX...');

        // 1. Create Document
        const createRes = await axios.post('https://open.feishu.cn/open-apis/docx/v1/documents', {
            folder_token: "", // Root
            title: "SOP 业务全景图 v3.0 (自动化生成)"
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (createRes.data.code !== 0) {
            console.error('Create Doc Failed:', JSON.stringify(createRes.data));
            return; // Will exit here if permission missing
        }

        const docId = createRes.data.data.document.document_id;
        console.log(`✅ Doc Created! Link: https://dcn010nrbuah.feishu.cn/docx/${docId}`);

        // 2. Add Content Blocks (Hierarchical Structure)
        const children = [
            // Section 1: Overview
            { block_type: 3, heading1: { elements: [{ text_run: { content: "1. 顶层总览 (Overall Architecture)" } }] } },
            { block_type: 2, text: { elements: [{ text_run: { content: "核心架构：以飞书 CRM 为中台，闲鱼与索尔作为两大分发触点。" } }] } },
            { block_type: 14, code: { language: 18, elements: [{ text_run: { content: DIAGRAM_OVERVIEW } }] } },

            // Section 2: Xianyu
            { block_type: 3, heading1: { elements: [{ text_run: { content: "2. 闲鱼渠道闭环 (Xianyu Channel)" } }] } },
            { block_type: 2, text: { elements: [{ text_run: { content: "负责处理 APP 内产生的流量与交易，需兼顾风控。" } }] } },
            { block_type: 14, code: { language: 18, elements: [{ text_run: { content: DIAGRAM_XIANYU } }] } },

            // Section 3: Sole
            { block_type: 3, heading1: { elements: [{ text_run: { content: "3. 索尔渠道闭环 (Sole Channel)" } }] } },
            { block_type: 2, text: { elements: [{ text_run: { content: "负责处理 Web/微信/私域 流量，核心是 Link 分发。" } }] } },
            { block_type: 14, code: { language: 18, elements: [{ text_run: { content: DIAGRAM_SOL } }] } },

            // Tips
            { block_type: 9, quote_container: { children: [{ block_type: 2, text: { elements: [{ text_run: { content: "💡 提示：在文档中点击代码块右上角的“Mermaid”图标即可预览图表。" } }] } }] } }
        ];

        console.log('Adding Blocks...');
        const blockRes = await axios.post(`https://open.feishu.cn/open-apis/docx/v1/documents/${docId}/blocks/${docId}/children`, {
            children: children,
            index: -1
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (blockRes.data.code === 0) {
            console.log('✅ Content Populated Successfully');
        } else {
            console.error('❌ Populate Failed:', JSON.stringify(blockRes.data));
        }

    } catch (e) {
        console.error('Script Error:', e.response?.data || e.message);
    }
}

createDoc();
