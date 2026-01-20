const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;
const TABLE_ID = 'tbl7itRZQo5rdcr5'; // Orders Table

const IMAGE_PATH = 'C:/Users/1/.gemini/antigravity/brain/1f340ad3-62ff-456d-a59b-639ae7e14c35/sop_v3_chinese_labels_1768360065267.png';

async function getAccessToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });
    return res.data.tenant_access_token;
}

async function addAttachmentField(token) {
    console.log('Adding "SOP_Archive" column...');
    try {
        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/fields`, {
            field_name: "SOP_Archive",
            type: 17 // Attachment
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('✅ Field Added:', res.data.data.field.field_id);
            return res.data.data.field.field_name;
        } else {
            // If field already exists, ignore error
            console.log('⚠️ Field add response:', res.data.msg);
            return "SOP_Archive";
        }
    } catch (e) {
        console.error('Field Add Error:', e.response?.data || e.message);
        return "SOP_Archive"; // Try to continue even if fails (maybe exists)
    }
}

async function uploadImage(token) {
    console.log('Uploading Image...');
    const stats = fs.statSync(IMAGE_PATH);
    const formData = new FormData();
    formData.append('file_name', 'SOP_Flow_v3_Chinese.png');
    formData.append('parent_type', 'bitable_image');
    formData.append('parent_node', BASE_TOKEN);
    formData.append('size', stats.size);
    formData.append('file', fs.createReadStream(IMAGE_PATH));

    const res = await axios.post('https://open.feishu.cn/open-apis/drive/v1/medias/upload_all', formData, {
        headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
        }
    });

    if (res.data.code === 0) {
        return res.data.data.file_token;
    } else {
        throw new Error('Upload Failed: ' + JSON.stringify(res.data));
    }
}

async function createRecord(token, fileToken) {
    console.log('Creating Record...');
    try {
        const fields = {
            "order_id": "SOP_V3_ARCHIVE",
            "SOP_Archive": [{ "file_token": fileToken }]
        };

        const res = await axios.post(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`, {
            fields: fields
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log('✅ Success! Record ID:', res.data.data.record.record_id);
        } else {
            console.error('❌ Record Create Failed:', JSON.stringify(res.data));
        }
    } catch (e) {
        console.error('Record Create Error:', e.response?.data || e.message);
    }
}

async function main() {
    try {
        const token = await getAccessToken();
        await addAttachmentField(token);
        const fileToken = await uploadImage(token);
        await createRecord(token, fileToken);
    } catch (e) {
        console.error('Process Failed:', e.message);
    }
}

main();
