const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = 'tbl7itRZQo5rdcr5';
const RECORD_ID = 'recv8fd74Ezc49'; // The exact ID from previous step

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function deleteRecord() {
    try {
        const token = await getAccessToken();
        console.log(`Deleting Record ${RECORD_ID}...`);

        const res = await axios.delete(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${RECORD_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('✅ Record Deleted Successfully');
        } else {
            console.error('❌ Delete Failed:', JSON.stringify(res.data));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

deleteRecord();
