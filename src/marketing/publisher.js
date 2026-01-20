const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const axios = require('axios');
const fs = require('fs-extra');
const { marked } = require('marked'); // Need to install this
const { getWeChatToken } = require('./designer');

const cheerio = require('cheerio');

const OUTPUT_DIR = path.join(__dirname, '../../output');
const DATA_DIR = path.join(__dirname, '../../data');

function applyWeChatStyles(htmlContent, coverImageUrl) {
    const $ = cheerio.load(htmlContent);

    // 1. 全局样式容器
    $('body').css('font-family', '-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif');
    $('body').css('line-height', '1.8');
    $('body').css('font-size', '16px');
    $('body').css('color', '#333');

    // 2. 标题样式 (仿路透橙色风格)
    $('h1').remove(); // 移除 H1 (通常作为标题字段)

    $('h2').each((i, el) => {
        $(el).css('font-size', '20px');
        $(el).css('font-weight', 'bold');
        $(el).css('color', '#D35400'); // 橙红色
        $(el).css('margin-top', '30px');
        $(el).css('margin-bottom', '15px');
        $(el).css('padding-left', '10px');
        $(el).css('border-left', '4px solid #D35400');
    });

    $('h3').each((i, el) => {
        $(el).css('font-size', '17px');
        $(el).css('font-weight', 'bold');
        $(el).css('color', '#2C3E50');
        $(el).css('margin-top', '20px');
        $(el).css('margin-bottom', '10px');
    });

    // 3. 列表/要闻提示样式 (背景框)
    $('ul').each((i, el) => {
        $(el).css('background-color', '#F8F9F9');
        $(el).css('padding', '20px');
        $(el).css('padding-left', '30px'); // Bullet space
        $(el).css('border-radius', '6px');
        $(el).css('margin-bottom', '20px');
        $(el).css('list-style-type', 'square');
        $(el).css('color', '#566573');
        $(el).css('font-size', '15px');
    });

    // 4. 正文段落
    $('p').each((i, el) => {
        $(el).css('margin-bottom', '20px');
        $(el).css('text-align', 'justify');
    });

    // 5. 插入封面图 (在第一个 H2 之前，或者文章开头)
    if (coverImageUrl) {
        const imgTag = `<figure style="margin: 20px 0;"><img src="${coverImageUrl}" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" /><figcaption style="text-align: center; color: #999; font-size: 12px; margin-top: 5px;">AI Generated Coverage</figcaption></figure>`;
        $('h2').first().before(imgTag);
    }

    return $.html(); // Return full HTML with inline styles
}

async function publishDraft() {
    try {
        const token = await getWeChatToken();

        // Get Cover Image & Meta
        let thumb_media_id, cover_image_url;
        try {
            const meta = await fs.readJson(path.join(DATA_DIR, 'cover_meta.json'));
            thumb_media_id = meta.wechat_media_id || meta.media_id;
            cover_image_url = meta.image_url; // Generated URL
        } catch {
            console.log("No cover meta found.");
            throw new Error("Missing cover meta");
        }

        // Read Articles
        const files = await fs.readdir(OUTPUT_DIR);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        if (mdFiles.length === 0) {
            console.log("No articles to publish.");
            return;
        }

        const articlesPayload = [];

        for (const file of mdFiles) {
            const content = await fs.readFile(path.join(OUTPUT_DIR, file), 'utf-8');
            let htmlContent = marked.parse(content);

            // Stylize
            htmlContent = applyWeChatStyles(htmlContent, cover_image_url);

            const title = file.replace('.md', '').substring(0, 64);

            articlesPayload.push({
                title: title,
                author: "编辑团队",
                digest: content.substring(0, 50).replace(/[#*]/g, ''),
                content: htmlContent,
                content_source_url: "",
                thumb_media_id: thumb_media_id,
                need_open_comment: 1,
                only_fans_can_comment: 0
            });
        }

        // Send to Draft
        console.log(`Uploading ${articlesPayload.length} articles to Draft...`);
        const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

        const res = await axios.post(url, {
            articles: articlesPayload
        });

        if (res.data.errcode) {
            throw new Error(`Draft Error: ${res.data.errmsg}`);
        }

        console.log(`Success! Draft Media ID: ${res.data.media_id}`);
        // Log to Feishu? (Next step)

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

if (require.main === module) {
    publishDraft();
}
