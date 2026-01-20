/**
 * 视频发布器
 * 支持小红书和知乎视频发布
 * 使用Playwright浏览器自动化
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ========== 视频发布器类 ==========

class VideoPublisher {
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

    // ========== 小红书视频发布 ==========

    async publishVideoToXiaohongshu(content, options = {}) {
        console.log(`\n🎬 发布视频到小红书: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            // 访问发布页面
            await page.goto('https://creator.xiaohongshu.com/publish/publish');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            console.log('📹 请在浏览器中：');
            console.log('   1. 确保在「上传视频」选项卡');
            console.log('   2. 上传视频文件');
            console.log('   等待视频上传完成后脚本会自动继续...');

            // 如果提供了视频路径，尝试自动上传
            if (content.videoPath && fs.existsSync(content.videoPath)) {
                console.log(`\n📁 检测到本地视频: ${content.videoPath}`);

                // 等待文件上传框
                const fileInput = page.locator('input[type="file"][accept*="video"]').first();
                if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await fileInput.setInputFiles(content.videoPath);
                    console.log('   ⏳ 视频上传中...');
                } else {
                    console.log('   ⚠️ 未找到视频上传框，请手动上传');
                }
            }

            // 等待标题输入框出现（视频上传完成后）
            console.log('\n⏳ 等待视频处理完成...');
            await page.waitForSelector('input[placeholder*="标题"]', { timeout: 300000 }); // 5分钟

            console.log('✅ 视频上传完成，开始填写内容');
            await page.waitForTimeout(2000);

            // 填写标题
            const titleInput = page.locator('input[placeholder*="标题"]');
            await titleInput.fill(content.title);
            console.log('   ✓ 标题已填写');

            // 填写正文/描述
            const contentArea = page.locator('[contenteditable="true"]').first();
            if (await contentArea.isVisible()) {
                await contentArea.click();

                let fullContent = content.description || content.content || '';
                if (content.tags && content.tags.length > 0) {
                    fullContent += '\n\n' + content.tags.map(t => `#${t}`).join(' ');
                }
                await page.keyboard.type(fullContent);
                console.log('   ✓ 描述已填写');
            }

            // 选择封面（可选）
            if (content.coverImage) {
                console.log('   🖼️ 封面设置待实现');
            }

            console.log('\n✅ 小红书视频发布准备完成');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📌 请检查内容，确认无误后点击「发布」');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (!options.keepOpen) {
                await page.waitForTimeout(5000);
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 小红书视频发布失败:', error.message);
            await page.close();
            return { success: false, error: error.message };
        }
    }

    // ========== 知乎视频发布 ==========

    async publishVideoToZhihu(content, options = {}) {
        console.log(`\n🎬 发布视频到知乎: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            // 访问知乎创作者中心
            await page.goto('https://www.zhihu.com/creator');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 检查登录状态
            const needLogin = await page.locator('button:has-text("登录")').isVisible({ timeout: 3000 }).catch(() => false);
            if (needLogin) {
                console.log('⚠️ 需要登录知乎，请在浏览器中手动登录...');
                await page.waitForTimeout(60000);
            }

            console.log('📹 请在浏览器中：');
            console.log('   1. 点击「发视频」或「发布」按钮');
            console.log('   2. 上传视频文件');
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
            await page.waitForSelector('input[placeholder*="标题"], textarea[placeholder*="标题"]', { timeout: 300000 });

            console.log('✅ 视频上传完成，开始填写内容');
            await page.waitForTimeout(2000);

            // 填写标题
            const titleInput = page.locator('input[placeholder*="标题"], textarea[placeholder*="标题"]').first();
            await titleInput.fill(content.title);
            console.log('   ✓ 标题已填写');

            // 填写描述
            const descInput = page.locator('textarea[placeholder*="描述"], textarea[placeholder*="简介"]').first();
            if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await descInput.fill(content.description || content.content || '');
                console.log('   ✓ 描述已填写');
            }

            console.log('\n✅ 知乎视频发布准备完成');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📌 请检查内容，确认无误后点击「发布」');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            if (!options.keepOpen) {
                await page.waitForTimeout(5000);
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 知乎视频发布失败:', error.message);
            await page.close();
            return { success: false, error: error.message };
        }
    }

    // ========== 双平台视频发布 ==========

    async publishVideoBoth(content, options = {}) {
        const results = {};

        // 小红书
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 第1步: 发布到小红书');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        results.xiaohongshu = await this.publishVideoToXiaohongshu(content, options);

        // 知乎
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 第2步: 发布到知乎');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        results.zhihu = await this.publishVideoToZhihu(content, options);

        return results;
    }
}

// ========== 测试 ==========

async function test() {
    console.log('🎬 测试视频发布器\n');

    const publisher = new VideoPublisher();

    try {
        await publisher.init();

        const testContent = {
            title: '【测试】AI自动发布视频测试',
            description: `这是视频发布测试 🎬

新增功能：
✅ 小红书视频发布
✅ 知乎视频发布
✅ 自动填写标题和描述

#AI自动化 #视频发布`,
            tags: ['测试', '视频', 'AI'],
            videoPath: '' // 留空让用户手动上传
        };

        // 测试小红书视频发布
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试小红书视频发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const xhsResult = await publisher.publishVideoToXiaohongshu(testContent, { keepOpen: true });

        // 测试知乎视频发布
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试知乎视频发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const zhihuResult = await publisher.publishVideoToZhihu(testContent, { keepOpen: true });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 视频发布结果:');
        console.log(`   小红书: ${xhsResult.success ? '✅' : '❌'}`);
        console.log(`   知乎: ${zhihuResult.success ? '✅' : '❌'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📌 页面保持打开，请检查内容');
        console.log('按 Ctrl+C 结束...');

        await new Promise(resolve => setTimeout(resolve, 600000));

    } finally {
        await publisher.close();
    }
}

// 导出
module.exports = { VideoPublisher };

// 直接运行
if (require.main === module) {
    test().catch(console.error);
}
