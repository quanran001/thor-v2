const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
// ==================== 工作流 配置 ====================
// Map GitHub Secrets to these variables
const API_KEY = process.env.SOB_IMAGE_KEY || process.env.YUNWU_IMAGE_KEY;
const API_BASE = process.env.SOB_API_BASE || "https://api.yunwu.ai/v1";
const IMAGE_MODEL = process.env.SOB_IMAGE_MODEL || "mj_imagine";

// Doubao Backup Key (Mapped from AFAN_DOUBAO_SEEDREAM_4)
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || process.env.AFAN_DOUBAO_SEEDREAM_4;

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_APPSECRET;
const DATA_DIR = path.join(__dirname, '../../data');

// ==================== 工作流 1: 生图 (优先MJ/Grsai，兜底豆包) ====================
async function generateImage(prompt) {
    console.log(`[AI-Image] Generating image...`);

    // --- 1. Strategy: Doubao (Volcengine) [PRIMARY] ---
    if (DOUBAO_API_KEY) {
        console.log(`[AI-Image] Strategy: Using Primary (Doubao)...`);
        try {
            const doubaoEndpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
            const payload = {
                "model": "doubao-seedream-4-0-250828",
                "prompt": prompt,
                "sequential_image_generation": "disabled",
                "response_format": "url",
                "size": "16:9", // Doubao supports 16:9? Defaulted to 2K before, maybe 16:9 is safer if supported, else "2K"
                "stream": false,
                "watermark": false
            };
            // Note: size "2K" is standard for Doubao, checking docs if "16:9" works. 
            // Previous code used "2K". I will stick to "2K" but maybe "1280*720"? 
            // 2K is safe.
            payload.size = "2K";

            const res = await axios.post(doubaoEndpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${DOUBAO_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            if (res.data && res.data.data && res.data.data[0] && res.data.data[0].url) {
                const url = res.data.data[0].url;
                console.log(`[AI-Image] Doubao Success: ${url}`);
                return url;
            }
        } catch (e) {
            console.error(`[AI-Image] Doubao Failed: ${e.message}`);
            if (e.response) console.error(JSON.stringify(e.response.data));
        }
    }

    // --- 2. Strategy: Yunwu/Grsai [BACKUP] ---
    console.log(`[AI-Image] Strategy: Using Backup (Yunwu/Grsai)...`);
    try {
        const baseUrl = API_BASE.replace(/\/+$/, '');
        let endpoint = `${baseUrl}/images/generations`;
        if (baseUrl.includes('grsai')) endpoint = `${baseUrl}/draw/completions`;

        const payload = {
            "model": IMAGE_MODEL,
            "prompt": prompt,
            "size": "16:9",
            "variants": 1
        };

        const res = await axios.post(endpoint, payload, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 120000
        });

        if (res.data?.data?.[0]?.url) return res.data.data[0].url;
        if (res.data?.url) return res.data.url;
        if (typeof res.data?.data === 'string' && res.data.data.startsWith('http')) return res.data.data;

    } catch (e) {
        console.error(`[AI-Image] Yunwu Backup Failed: ${e.message}.`);
    }

    // --- 3. Final Fail ---
    console.error(`[AI-Image] All Generators Failed.`);
    return "https://dummyimage.com/1024x576/1c6ea4/ffffff.png&text=SOP+AI+Generated";
}

// ==================== 工作流 2: 飞书获取 Token ====================
async function getFeishuToken() {
    const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
    });
    return res.data.tenant_access_token;
}

// ==================== 工作流 3: 上传图片到飞书 ====================
async function uploadImageToFeishu(imageUrl) {
    console.log(`[Feishu] Downloading image from ${imageUrl}...`);

    const feishuToken = await getFeishuToken();

    // Download image
    const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResp.data);

    console.log(`[Feishu] Uploading to Feishu Drive...`);

    const form = new FormData();
    form.append('file_name', 'cover.png');
    form.append('parent_type', 'explorer');
    form.append('parent_node', 'root'); // Or specific folder token
    form.append('size', imageBuffer.length);
    form.append('file', imageBuffer, { filename: 'cover.png', contentType: 'image/png' });

    const res = await axios.post('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', form, {
        headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${feishuToken}`
        }
    });

    console.log(`[Feishu] Upload result:`, res.data);
    return res.data.data?.file_token;
}

// ==================== 工作流 4: 微信获取 Token ====================
async function getWeChatToken() {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`;
    const res = await axios.get(url);
    if (res.data.errcode) {
        console.error("❌ WECHAT API ERROR:", JSON.stringify(res.data, null, 2));
        require('fs-extra').outputJsonSync('wechat_error.json', res.data);
        throw new Error(`WeChat Token Error: ${res.data.errmsg}`);
    }
    return res.data.access_token;
}

// ==================== 工作流 5: 上传图片到微信素材库 ====================
async function uploadImageToWeChat(imageUrl) {
    console.log(`[WeChat] Downloading image from ${imageUrl}...`);

    const token = await getWeChatToken();

    try {
        const imageResp = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const buffer = Buffer.from(imageResp.data);
        console.log(`[WeChat] Image downloaded. Size: ${buffer.length} bytes.`);

        const form = new FormData();
        form.append('media', buffer, { filename: 'cover.png', contentType: 'image/png' });

        const uploadUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;
        console.log(`[WeChat] Uploading to WeChat API...`);

        const requestHeaders = {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Length': form.getLengthSync()
        };

        const res = await axios.post(uploadUrl, form, {
            headers: requestHeaders,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (res.data.errcode) {
            console.error("❌ WECHAT UPLOAD ERROR:", JSON.stringify(res.data));
            throw new Error(`WeChat Upload Error: ${res.data.errmsg}`);
        }
        console.log(`[WeChat] Media ID: ${res.data.media_id}`);
        return res.data.media_id;
    } catch (e) {
        console.error("❌ Error inside uploadImageToWeChat:", e.response ? e.response.status : e.message);
        throw e;
    }
}

// ==================== 主流程 ====================
async function main() {
    await fs.ensureDir(DATA_DIR);

    try {
        // 1. 读取已生成的文章，提取标题作为生图 Prompt
        const topicsFile = path.join(DATA_DIR, 'selected_topics.json');
        const topics = await fs.readJson(topicsFile);
        const firstTopic = topics[0];

        // 2. 优化 Prompt：增加美学关键词
        const prompt = `Minimalist abstract illustration about ${firstTopic.title}, high quality, 8k resolution, soft lighting, premium corporate style, frosted glass texture, tech vibe, no text, clean composition`;

        // 2. 调用生图工作流
        const imageUrl = await generateImage(prompt);

        // 3. 上传到飞书存档 (Optional)
        // ... (Skipping Feishu for speed if token missing, but keeping logic)
        let feishuToken = null;
        if (FEISHU_APP_ID && FEISHU_APP_SECRET) {
            try { feishuToken = await uploadImageToFeishu(imageUrl); } catch (e) { }
        }

        // 4. 上传到微信素材库 (供 Publisher 使用)
        const mediaId = await uploadImageToWeChat(imageUrl);

        // 5. 保存 meta 供 Publisher 使用
        await fs.writeJson(path.join(DATA_DIR, 'cover_meta.json'), {
            feishu_token: feishuToken,
            wechat_media_id: mediaId,
            image_url: imageUrl
        }, { spaces: 2 });

        console.log('[Designer] Completed.');

    } catch (e) {
        console.error('[Designer] Failed:', e.message);
        process.exit(1);
    }
}

// Export for reuse
module.exports = { generateImage, uploadImageToFeishu, uploadImageToWeChat, getWeChatToken };

if (require.main === module) {
    main();
}
