const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const cheerio = require('cheerio');

const OUTPUT_DIR = path.join(__dirname, '../05-wechat-pro/output');
const PREVIEW_FILE = path.join(__dirname, '../05-wechat-pro/debug_preview.html');

function applyWeChatStyles(htmlContent) {
    const $ = cheerio.load(htmlContent);

    $('body').css('font-family', '-apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif');
    $('body').css('line-height', '1.8');
    $('body').css('color', '#333');

    // Remove H1
    $('h1').remove();

    // H2 Orange
    $('h2').each((i, el) => {
        $(el).css('font-size', '20px');
        $(el).css('font-weight', 'bold');
        $(el).css('color', '#D35400'); // Orange
        $(el).css('margin-top', '30px');
        $(el).css('margin-bottom', '15px');
        $(el).css('padding-left', '10px');
        $(el).css('border-left', '4px solid #D35400');
    });

    // List Box
    $('ul').each((i, el) => {
        $(el).css('background-color', '#F8F9F9');
        $(el).css('padding', '20px');
        $(el).css('border-radius', '6px');
        $(el).css('list-style-type', 'square');
        $(el).css('color', '#566573');
    });

    // Mock Cover
    const imgTag = `<figure style="margin: 20px 0;"><img src="https://via.placeholder.com/800x450.png?text=WeChat+Cover+Test" style="width: 100%; border-radius: 8px;" /><figcaption style="text-align: center; color: #999; font-size: 12px;">Mock Cover Image</figcaption></figure>`;
    $('h2').first().before(imgTag);

    return $.html();
}

async function main() {
    console.log("Generating Style Preview...");
    const files = await fs.readdir(OUTPUT_DIR);
    const mdFile = files.find(f => f.endsWith('.md'));

    if (!mdFile) {
        console.error("No MD file found.");
        return;
    }

    const content = await fs.readFile(path.join(OUTPUT_DIR, mdFile), 'utf-8');
    const html = marked.parse(content);
    const styledHtml = applyWeChatStyles(html);

    await fs.writeFile(PREVIEW_FILE, styledHtml);
    console.log(`Preview saved to: ${PREVIEW_FILE}`);
}

main().catch(console.error);
