/**
 * 微信视频号发布器
 * 使用Playwright浏览器自动化发布到微信视频号
 */

const { chromium } = require('playwright');
const fs = require('fs');

// ========== 微信视频号发布器类 ==========

class WeChatChannelsPublisher {
    constructor(options = {}) {
        this.browser = null;
        this.options = {
            headless: false,
            slowMo: 50,
            ...options
        };
    }

    async init() {
        this.browser = await chromium.launchPersistentContext('./playwright-data', {
            headless: this.options.headless,
            slowMo: this.options.slowMo,
            viewport: { width: 1400, height: 900 }
        });
        console.log('✅ 浏览器已启动');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('✅ 浏览器已关闭');
        }
    }

    // ========== 微信视频号发布 ==========

    async publishToChannels(content, options = {}) {
        console.log(`\n🎬 发布到微信视频号: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            // 访问微信视频号创作者中心
            await page.goto('https://channels.weixin.qq.com/platform/post/create');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 检查登录状态（通常需要扫码）
            const qrCode = await page.locator('img[alt*="二维码"], .qrcode, canvas').first().isVisible({ timeout: 5000 }).catch(() => false);

            if (qrCode) {
                console.log('📱 请使用微信扫码登录...');
                console.log('   登录后脚本会自动继续');

                // 等待扫码登录完成
                await page.waitForSelector('input[placeholder*="标题"], textarea[placeholder*="标题"], input[type="file"]', { timeout: 180000 });
                console.log('✅ 登录成功！');
            }

            await page.waitForTimeout(2000);

            console.log('📹 请在浏览器中：');
            console.log('   1. 上传视频文件');
            console.log('   等待视频上传完成后脚本会自动继续');

            // 如果提供了视频路径，尝试自动上传
            if (content.videoPath && fs.existsSync(content.videoPath)) {
                console.log(`\n📁 检测到本地视频: ${content.videoPath}`);

                const fileInput = page.locator('input[type="file"]').first();
                if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await fileInput.setInputFiles(content.videoPath);
                    console.log('   ⏳ 视频上传中...');
                }
            }

            // 等待标题输入框出现（视频上传/处理完成后）
            console.log('\n⏳ 等待视频处理完成...');
            await page.waitForSelector('input[placeholder*="标题"], textarea[placeholder*="描述"], [contenteditable="true"]', { timeout: 300000 });

            console.log('✅ 视频处理完成，开始填写内容');
            await page.waitForTimeout(2000);

            // 填写标题
            const titleInput = page.locator('input[placeholder*="标题"], input[placeholder*="输入"]').first();
            if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await titleInput.fill(content.title);
                console.log('   ✓ 标题已填写');
            }

            // 填写描述
            const descArea = page.locator('textarea[placeholder*="描述"], [contenteditable="true"]').first();
            if (await descArea.isVisible({ timeout: 3000 }).catch(() => false)) {
                await descArea.click();

                let desc = content.description || content.content || '';
                if (content.tags && content.tags.length > 0) {
                    desc += '\n\n' + content.tags.map(t => `#${t}`).join(' ');
                }

                await page.keyboard.type(desc);
                console.log('   ✓ 描述已填写');
            }

            console.log('\n✅ 微信视频号内容准备完成');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📌 请检查内容，确认无误后点击「发表」');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (!options.keepOpen) {
                await page.waitForTimeout(10000);
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 微信视频号发布失败:', error.message);
            if (!options.keepOpen) await page.close();
            return { success: false, error: error.message };
        }
    }
}

// ========== 测试 ==========

async function test() {
    console.log('🚀 测试微信视频号发布器\n');

    const publisher = new WeChatChannelsPublisher();

    try {
        await publisher.init();

        const testContent = {
            title: '【测试】AI自动发布到微信视频号',
            description: `这是微信视频号自动发布测试 🎉

新增功能：
✅ 微信视频号发布

#AI自动化 #效率工具`,
            tags: ['测试', 'AI', '自动化'],
            videoPath: '' // 留空让用户手动上传
        };

        // 测试微信视频号
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试微信视频号发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const result = await publisher.publishToChannels(testContent, { keepOpen: true });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 发布结果:');
        console.log(`   微信视频号: ${result.success ? '✅' : '❌'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📌 页面保持打开，请检查内容');
        console.log('按 Ctrl+C 结束...');

        await new Promise(resolve => setTimeout(resolve, 600000));

    } finally {
        await publisher.close();
    }
}

// 导出
module.exports = { WeChatChannelsPublisher };

// 直接运行
if (require.main === module) {
    test().catch(console.error);
}
