/**
 * 全平台发布器
 * 支持: 小红书、知乎、微博、抖音
 * 使用Playwright浏览器自动化
 */

const { chromium } = require('playwright');
const fs = require('fs');

// ========== 全平台发布器类 ==========

class MultiPlatformPublisher {
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

    // ========== 微博发布 ==========

    async publishToWeibo(content, options = {}) {
        console.log(`\n📱 发布到微博: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            // 访问微博创作者中心
            await page.goto('https://weibo.com/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 检查登录状态
            const needLogin = await page.locator('text=登录').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (needLogin) {
                console.log('⚠️ 需要登录微博，请在浏览器中扫码登录...');
                console.log('   登录后脚本会自动继续');

                // 等待登录完成（检测发布框出现）
                await page.waitForSelector('textarea[placeholder*="分享"]', { timeout: 180000 });
            }

            console.log('✅ 已登录微博');
            await page.waitForTimeout(2000);

            // 点击发布区域
            const publishArea = page.locator('textarea[placeholder*="分享"], textarea[placeholder*="有什么新鲜事"]').first();

            if (await publishArea.isVisible()) {
                await publishArea.click();
                await page.waitForTimeout(1000);

                // 输入内容
                let fullContent = content.title + '\n\n' + (content.content || content.description || '');
                if (content.tags && content.tags.length > 0) {
                    fullContent += '\n\n' + content.tags.map(t => `#${t}#`).join(' ');
                }

                await page.keyboard.type(fullContent);
                console.log('   ✓ 内容已填写');

                // 如果有图片，提示上传
                if (content.images && content.images.length > 0 || content.videoPath) {
                    console.log('📸 请在浏览器中上传图片或视频...');
                }
            } else {
                console.log('⚠️ 未找到发布区域，请手动操作');
            }

            console.log('\n✅ 微博内容准备完成');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📌 请检查内容，确认无误后点击「发送」');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (!options.keepOpen) {
                await page.waitForTimeout(10000);
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 微博发布失败:', error.message);
            if (!options.keepOpen) await page.close();
            return { success: false, error: error.message };
        }
    }

    // ========== 抖音发布 ==========

    async publishToDouyin(content, options = {}) {
        console.log(`\n🎬 发布到抖音: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            // 访问抖音创作服务平台
            await page.goto('https://creator.douyin.com/creator-micro/content/upload');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 检查登录状态
            const needLogin = await page.locator('text=登录').first().isVisible({ timeout: 3000 }).catch(() => false);
            if (needLogin) {
                console.log('⚠️ 需要登录抖音，请在浏览器中扫码登录...');
                console.log('   登录后脚本会自动继续');

                await page.waitForTimeout(120000); // 等待2分钟登录
            }

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

            // 等待标题输入框出现
            console.log('\n⏳ 等待视频处理完成...');
            await page.waitForSelector('input[placeholder*="标题"], textarea[placeholder*="标题"], input[placeholder*="作品"]', { timeout: 300000 });

            console.log('✅ 视频上传完成，开始填写内容');
            await page.waitForTimeout(2000);

            // 填写标题/描述
            const titleInput = page.locator('input[placeholder*="标题"], textarea[placeholder*="标题"], input[placeholder*="作品"]').first();
            if (await titleInput.isVisible()) {
                await titleInput.fill(content.title);
                console.log('   ✓ 标题已填写');
            }

            // 填写描述
            const descInput = page.locator('textarea[placeholder*="描述"], textarea[placeholder*="简介"]').first();
            if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                let desc = content.description || content.content || '';
                if (content.tags && content.tags.length > 0) {
                    desc += '\n\n' + content.tags.map(t => `#${t}`).join(' ');
                }
                await descInput.fill(desc);
                console.log('   ✓ 描述已填写');
            }

            console.log('\n✅ 抖音内容准备完成');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📌 请检查内容，确认无误后点击「发布」');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (!options.keepOpen) {
                await page.waitForTimeout(10000);
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 抖音发布失败:', error.message);
            if (!options.keepOpen) await page.close();
            return { success: false, error: error.message };
        }
    }

    // ========== 全平台发布 ==========

    async publishToAll(content, platforms = ['weibo', 'douyin'], options = {}) {
        const results = {};

        for (const platform of platforms) {
            console.log(`\n${'━'.repeat(40)}`);
            console.log(`📱 发布到: ${platform.toUpperCase()}`);
            console.log('━'.repeat(40));

            switch (platform) {
                case 'weibo':
                    results.weibo = await this.publishToWeibo(content, options);
                    break;
                case 'douyin':
                    results.douyin = await this.publishToDouyin(content, options);
                    break;
                default:
                    console.log(`⚠️ 未知平台: ${platform}`);
            }

            // 平台间等待
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        return results;
    }
}

// ========== 测试 ==========

async function test() {
    console.log('🚀 测试微博+抖音发布器\n');

    const publisher = new MultiPlatformPublisher();

    try {
        await publisher.init();

        const testContent = {
            title: '【测试】AI自动发布测试',
            content: `这是多平台自动发布测试 🎉

新增功能：
✅ 微博发布
✅ 抖音发布

#AI自动化 #效率工具`,
            description: '多平台自动发布测试',
            tags: ['测试', 'AI', '自动化'],
            videoPath: '' // 留空让用户手动上传
        };

        // 测试微博
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试微博发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const weiboResult = await publisher.publishToWeibo(testContent, { keepOpen: true });

        // 测试抖音
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试抖音发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const douyinResult = await publisher.publishToDouyin(testContent, { keepOpen: true });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 发布结果:');
        console.log(`   微博: ${weiboResult.success ? '✅' : '❌'}`);
        console.log(`   抖音: ${douyinResult.success ? '✅' : '❌'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📌 页面保持打开，请检查内容');
        console.log('按 Ctrl+C 结束...');

        await new Promise(resolve => setTimeout(resolve, 600000));

    } finally {
        await publisher.close();
    }
}

// 导出
module.exports = { MultiPlatformPublisher };

// 直接运行
if (require.main === module) {
    test().catch(console.error);
}
