const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const TABLE_ID = process.env.FEISHU_NOTIFICATIONS_TABLE_ID; // Use Notifications table for logging
const APP_TOKEN = process.env.FEISHU_BASE_TOKEN; // Actually this is Base Token

// Image to archive
const IMAGE_PATH = 'C:/Users/1/.gemini/antigravity/brain/1f340ad3-62ff-456d-a59b-639ae7e14c35/sop_v3_chinese_labels_1768360065267.png';

async function getAccessToken() {
    console.log('Getting Access Token...');
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function archiveToTable(token) {
    console.log('Archiving Metadata to Base...');

    // Mermaid Source Code for Feishu Doc
    const mermaidCode = `graph TD
  Core[统一数据中台 Feishu CRM]
  Agent_XY[闲鱼机器人]
  Agent_Sol[索尔 Web客服]
  Core -.-> Agent_XY
  Core -.-> Agent_Sol`;

    const description = `SOP Business Flow v3.0 (KAI Style).
    
    [Architecture Definition]
    - Center: Feishu Base (CRM)
    - Left: Xianyu Channel
    - Right: Sol Channel (Web)
    
    [How to visualize in Feishu]
    Copy the Mermaid code below into a Feishu Doc 'Mermaid' block.
    
    ${mermaidCode}
    `;

    const fields = {
        "Content": description,
        "Type": "Architecture",
        "Status": "Archived",
        "Title": "SOP Business Flow v3.0 Source"
    };

    try {
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`, {
            fields: fields
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code !== 0) {
            console.error('Base Error:', JSON.stringify(res.data));
        } else {
            console.log('Archived successfully! Record ID:', res.data.data.record.record_id);
        }
    } catch (e) {
        console.error("Axios Error:", e.message);
    }
}

async function main() {
    try {
        const token = await getAccessToken();
        // Skip image upload due to permission 'im:resource:upload' missing
        await archiveToTable(token);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
