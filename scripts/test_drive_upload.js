const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const PARENT_NODE = process.env.FEISHU_BASE_TOKEN; // The Base Token acts as parent node for bitable images

const IMAGE_PATH = 'C:/Users/1/.gemini/antigravity/brain/1f340ad3-62ff-456d-a59b-639ae7e14c35/sop_v3_chinese_labels_1768360065267.png';

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function testUpload() {
    try {
        const token = await getAccessToken();
        const stats = fs.statSync(IMAGE_PATH);

        console.log('Attempting upload to Drive/Bitable...');
        const formData = new FormData();
        formData.append('file_name', 'sop_v3.png');
        formData.append('parent_type', 'bitable_image');
        formData.append('parent_node', PARENT_NODE);
        formData.append('size', stats.size);
        formData.append('file', fs.createReadStream(IMAGE_PATH));

        const res = await axios.post('https://open.feishu.cn/open-apis/drive/v1/medias/upload_all', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        if (res.data.code === 0) {
            console.log('✅ Upload Success! File Token:', res.data.data.file_token);
        } else {
            console.error('❌ Upload Failed:', JSON.stringify(res.data));
            console.log('\nNeed Scope hints based on error code.');
        }

    } catch (e) {
        console.error('Script Error:', e.message);
        if (e.response) console.error(e.response.data);
    }
}

testUpload();
