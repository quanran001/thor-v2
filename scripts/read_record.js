const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = 'tbl7itRZQo5rdcr5';
const RECORD_ID = 'recv8fmaVKLmDb';

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function readRecord() {
    console.log(`Reading Record ${RECORD_ID}...`);
    try {
        const token = await getAccessToken();
        const res = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${RECORD_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('✅ Record Found!');
            const fields = res.data.data.record.fields;
            console.log('--- Fields ---');
            Object.keys(fields).forEach(key => {
                const val = fields[key];
                // Truncate long text for display
                const valStr = JSON.stringify(val).substring(0, 100);
                console.log(`${key}: ${valStr}...`);
            });

            // Check specifically for our fields
            if (fields['SOP_Archive']) {
                console.log('\n[Found] SOP_Archive (Image): Yes, Token present.');
            } else {
                console.error('\n[Missing] SOP_Archive field is empty or missing!');
            }

            if (fields['SOP_Source_Code']) {
                console.log('[Found] SOP_Source_Code (Text): Yes, content present.');
            } else {
                console.error('[Missing] SOP_Source_Code field is empty or missing!');
            }

        } else {
            console.error('❌ Read Failed:', JSON.stringify(res.data));
        }

    } catch (e) {
        console.error('API Error:', e.message);
    }
}

readRecord();
