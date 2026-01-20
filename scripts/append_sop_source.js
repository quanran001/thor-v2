const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = 'tbl7itRZQo5rdcr5';
const RECORD_ID = 'recv8fmaVKLmDb'; // Using the record we just created with the image

// The full Mermaid Source that generates the v3 diagram
const MERMAID_SOURCE = `graph TD
    Feishu[(🧠 飞书 CRM 中台)]
    Xianyu[📱 闲鱼机器人]
    Sol[🌐 索尔 Web客服]
    Xianyu <-->|"双向同步(订单/会话)"| Feishu
    Sol <-->|"双向同步(订单/会话)"| Feishu
    classDef brain fill:#00d6b9,stroke:#333,stroke-width:2px,color:white;
    classDef agent fill:#ff9900,stroke:#333,stroke-width:2px,color:white;
    class Feishu brain;
    class Xianyu,Sol agent;`;

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function addField(token) {
    console.log('Ensure "SOP_Source_Code" field exists...');
    try {
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/fields`, {
            field_name: "SOP_Source_Code",
            type: 1 // Text
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(res.data.code === 0 ? '✅ Field Created' : `⚠️ Field Check: ${res.data.msg}`);
    } catch (e) {
        // Ignore if exists
    }
}

async function updateRecord(token) {
    console.log(`Updating Record ${RECORD_ID} with Mermaid Source...`);
    try {
        const res = await axios.put(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${RECORD_ID}`, {
            fields: {
                "SOP_Source_Code": MERMAID_SOURCE
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('✅ Source Code Archived Successfully!');
        } else {
            console.error('❌ Update Failed:', JSON.stringify(res.data));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function main() {
    const token = await getAccessToken();
    await addField(token);
    await updateRecord(token);
}

main();
