const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN; // "BtFWbkF2gaUVIQsRdriceSJanJh" from env matches user URL
const TABLE_ID = 'tbl7itRZQo5rdcr5'; // User provided

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function inspectTable() {
    try {
        const token = await getAccessToken();
        console.log(`Inspecting Table: ${TABLE_ID} in Base: ${BASE_TOKEN}`);

        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/fields`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('Fields found:');
            res.data.data.items.forEach(f => {
                console.log(`- ${f.field_name} (Type: ${f.type}) [ID: ${f.field_id}]`);
            });
        } else {
            console.error('Error inspecting table:', JSON.stringify(res.data));
        }
    } catch (e) {
        console.error('Axios Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

inspectTable();
