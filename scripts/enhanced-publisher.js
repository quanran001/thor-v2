/**
 * 增强型社交平台发布器
 * 新增功能：
 * 1. 图片自动上传
 * 2. 发布状态回写到飞书
 * 3. 定时发布支持
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ========== 图片自动上传模块 ==========

class ImageUploader {
    constructor(page) {
        this.page = page;
    }

    // 下载远程图片到本地
    async downloadImage(url, savePath) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(savePath, Buffer.from(buffer));
        return savePath;
    }

    // 小红书图片上传
    async uploadToXiaohongshu(imagePaths) {
        console.log(`📷 上传 ${imagePaths.length} 张图片到小红书...`);

        // 等待上传区域
        await this.page.waitForSelector('input[type="file"]', { timeout: 10000 });

        // 获取文件输入框
        const fileInput = this.page.locator('input[type="file"]').first();

        // 设置文件
        await fileInput.setInputFiles(imagePaths);

        // 等待上传完成（检测标题输入框出现）
        console.log('   ⏳ 等待图片上传完成...');
        await this.page.waitForSelector('input[placeholder*="标题"]', { timeout: 60000 });

        console.log('   ✅ 图片上传成功');
        return true;
    }

    // 知乎图片上传
    async uploadToZhihu(imagePaths) {
        console.log(`📷 上传 ${imagePaths.length} 张图片到知乎...`);

        // 知乎文章编辑器中插入图片
        for (const imagePath of imagePaths) {
            // 点击编辑器中的图片按钮
            const imageBtn = this.page.locator('button[aria-label="图片"]');
            if (await imageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await imageBtn.click();
                await this.page.waitForTimeout(500);

                // 设置文件
                const fileInput = this.page.locator('input[type="file"]');
                await fileInput.setInputFiles(imagePath);
                await this.page.waitForTimeout(2000);
            }
        }

        console.log('   ✅ 图片上传成功');
        return true;
    }
}

// ========== 飞书状态回写模块 ==========

class FeishuStatusWriter {
    constructor(config) {
        this.config = config;
        this.accessToken = '';
    }

    async getAccessToken() {
        const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: this.config.appId,
                app_secret: this.config.appSecret
            })
        });

        const data = await response.json();
        this.accessToken = data.tenant_access_token;
        return this.accessToken;
    }

    // 更新发布状态
    async updatePublishStatus(recordId, status, details = {}) {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.appToken}/tables/${this.config.tableId}/records/${recordId}`;

        const fields = {
            '发布状态': status,
            '发布时间': new Date().toISOString()
        };

        if (details.xiaohongshu) {
            fields['小红书状态'] = details.xiaohongshu.success ? '✅ 成功' : '❌ 失败';
            if (details.xiaohongshu.url) {
                fields['小红书链接'] = details.xiaohongshu.url;
            }
        }

        if (details.zhihu) {
            fields['知乎状态'] = details.zhihu.success ? '✅ 成功' : '❌ 失败';
            if (details.zhihu.url) {
                fields['知乎链接'] = details.zhihu.url;
            }
        }

        if (details.error) {
            fields['错误信息'] = details.error;
        }

        await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });

        console.log(`📝 已回写状态到飞书: ${status}`);
    }
}

// ========== 增强型发布器 ==========

class EnhancedPublisher {
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

    // 发布到小红书（带自动图片上传）
    async publishToXiaohongshu(content, options = {}) {
        console.log(`\n📱 发布到小红书: ${content.title}`);

        const page = await this.browser.newPage();
        const uploader = new ImageUploader(page);

        try {
            await page.goto('https://creator.xiaohongshu.com/publish/publish');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // 提示用户切换到图文模式
            console.log('📸 请在浏览器中点击「上传图文」选项卡，然后上传图片...');

            // 自动上传图片（如果提供了本地路径）
            if (content.images && content.images.length > 0) {
                // 检查是远程URL还是本地路径
                const localImages = [];
                for (let i = 0; i < content.images.length; i++) {
                    const img = content.images[i];
                    if (img.startsWith('http')) {
                        // 下载远程图片
                        const localPath = path.join('./temp', `img_${i}.jpg`);
                        await uploader.downloadImage(img, localPath);
                        localImages.push(localPath);
                    } else {
                        localImages.push(img);
                    }
                }

                await uploader.uploadToXiaohongshu(localImages);
            } else if (!options.skipImageWait) {
                // 没有图片，等待手动上传
                console.log('⚠️ 请在浏览器中手动上传图片...');
                await page.waitForSelector('input[placeholder*="标题"]', { timeout: 180000 });
            }

            // 填写标题
            const titleInput = page.locator('input[placeholder*="标题"]');
            await titleInput.fill(content.title);
            console.log('   ✓ 标题已填写');

            // 填写正文
            const contentArea = page.locator('[contenteditable="true"]').first();
            await contentArea.click();

            let fullContent = content.content;
            if (content.tags && content.tags.length > 0) {
                fullContent += '\n\n' + content.tags.map(t => `#${t}`).join(' ');
            }
            await page.keyboard.type(fullContent);
            console.log('   ✓ 正文已填写');

            // 可选：自动点击发布
            if (options.autoPublish) {
                const publishBtn = page.locator('button:has-text("发布")');
                await publishBtn.click();
                console.log('   ✓ 已点击发布');
                await page.waitForTimeout(3000);
            }

            console.log('✅ 小红书发布完成');

            if (!options.keepOpen) {
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 小红书发布失败:', error.message);
            await page.close();
            return { success: false, error: error.message };
        }
    }

    // 发布到知乎（带图片上传）
    async publishToZhihu(content, options = {}) {
        console.log(`\n📱 发布到知乎: ${content.title}`);

        const page = await this.browser.newPage();
        const uploader = new ImageUploader(page);

        try {
            await page.goto('https://zhuanlan.zhihu.com/write');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 填写标题
            const titleInput = page.locator('textarea[placeholder*="标题"]');
            if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await titleInput.fill(content.title);
                console.log('   ✓ 标题已填写');
            }

            // 填写正文
            const contentEditor = page.locator('.public-DraftEditor-content, [contenteditable="true"]').first();
            if (await contentEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
                await contentEditor.click();
                await page.keyboard.type(content.content);
                console.log('   ✓ 正文已填写');
            }

            // 上传图片
            if (content.images && content.images.length > 0) {
                await uploader.uploadToZhihu(content.images);
            }

            // 可选：自动发布
            if (options.autoPublish) {
                const publishBtn = page.locator('button:has-text("发布")');
                await publishBtn.click();
                console.log('   ✓ 已点击发布');
                await page.waitForTimeout(3000);
            }

            console.log('✅ 知乎发布完成');

            if (!options.keepOpen) {
                await page.close();
            }

            return { success: true, page: options.keepOpen ? page : null };

        } catch (error) {
            console.error('❌ 知乎发布失败:', error.message);
            await page.close();
            return { success: false, error: error.message };
        }
    }
}

// ========== 定时发布器 ==========

class ScheduledPublisher {
    constructor(publisher, feishuWriter) {
        this.publisher = publisher;
        this.feishuWriter = feishuWriter;
        this.scheduled = [];
    }

    // 添加定时任务
    schedule(content, publishTime) {
        const delay = new Date(publishTime).getTime() - Date.now();

        if (delay <= 0) {
            console.log('⚠️ 发布时间已过，立即发布');
            this.publishNow(content);
            return;
        }

        console.log(`⏰ 已设置定时发布: ${content.title}`);
        console.log(`   发布时间: ${new Date(publishTime).toLocaleString()}`);

        const task = {
            content,
            publishTime,
            timerId: setTimeout(() => this.publishNow(content), delay)
        };

        this.scheduled.push(task);
    }

    // 立即发布
    async publishNow(content) {
        const results = {};

        if (content.platform === 'xiaohongshu' || content.platform === 'both') {
            results.xiaohongshu = await this.publisher.publishToXiaohongshu(content);
        }

        if (content.platform === 'zhihu' || content.platform === 'both') {
            results.zhihu = await this.publisher.publishToZhihu(content);
        }

        // 回写状态到飞书
        if (this.feishuWriter && content.recordId) {
            const allSuccess = Object.values(results).every(r => r.success);
            await this.feishuWriter.updatePublishStatus(
                content.recordId,
                allSuccess ? '已发布' : '部分失败',
                results
            );
        }

        return results;
    }

    // 取消所有定时任务
    cancelAll() {
        this.scheduled.forEach(task => clearTimeout(task.timerId));
        this.scheduled = [];
        console.log('🚫 已取消所有定时任务');
    }
}

// ========== 导出 ==========

module.exports = {
    ImageUploader,
    FeishuStatusWriter,
    EnhancedPublisher,
    ScheduledPublisher
};

// ========== 测试 ==========

async function test() {
    console.log('🚀 测试增强型发布器\n');

    // 确保temp目录存在
    if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp');
    }

    const publisher = new EnhancedPublisher();

    try {
        await publisher.init();

        const testContent = {
            title: '【测试】增强版自动发布 - 支持图片上传',
            content: `这是增强版发布测试 🎉

新增功能：
✅ 图片自动上传
✅ 发布状态回写到飞书
✅ 定时发布支持

#AI自动化 #效率工具`,
            platform: 'both',
            tags: ['测试', '自动化'],
            images: [] // 可以添加本地图片路径
        };

        // 测试小红书（保持页面打开）
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试小红书发布（增强版）');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const xhsResult = await publisher.publishToXiaohongshu(testContent, { keepOpen: true });

        // 测试知乎（保持页面打开）
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 测试知乎发布（增强版）');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const zhihuResult = await publisher.publishToZhihu(testContent, { keepOpen: true });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 发布结果:');
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

if (require.main === module) {
    test().catch(console.error);
}
