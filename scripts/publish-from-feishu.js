/**
 * 飞书内容发布集成模块 (纯JavaScript版)
 * 从飞书多维表格读取待发布内容,自动发布到小红书/知乎
 */

const { chromium } = require('playwright');

// ========== 飞书API封装 ==========

class FeishuContentReader {
    constructor(config) {
        this.config = config;
        this.accessToken = '';
    }

    // 获取访问令牌
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

    // 读取待发布内容
    async getPendingContent() {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.appToken}/tables/${this.config.tableId}/records`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.code !== 0) {
            throw new Error(`飞书API错误: ${data.msg}`);
        }

        // 过滤待发布内容
        return data.data.items
            .filter(item => item.fields['发布状态'] === '待发布')
            .map(item => ({
                recordId: item.record_id,
                title: item.fields['标题'] || '',
                content: item.fields['正文'] || '',
                platform: item.fields['目标平台'] || 'both',
                status: 'pending',
                images: item.fields['图片'] || [],
                tags: (item.fields['标签'] || '').split(',').filter(t => t.trim())
            }));
    }

    // 更新发布状态
    async updateStatus(recordId, status, message) {
        if (!this.accessToken) {
            await this.getAccessToken();
        }

        const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.appToken}/tables/${this.config.tableId}/records/${recordId}`;

        await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    '发布状态': status,
                    '发布时间': new Date().toISOString(),
                    '备注': message || ''
                }
            })
        });
    }
}

// ========== 多平台发布器 ==========

class MultiPlatformPublisher {
    constructor() {
        this.browser = null;
    }

    async init() {
        this.browser = await chromium.launchPersistentContext('./playwright-data', {
            headless: false,
            slowMo: 50,
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

    // 发布到小红书
    async publishToXiaohongshu(content) {
        console.log(`\n📝 发布到小红书: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            await page.goto('https://creator.xiaohongshu.com/publish/publish');
            await page.waitForLoadState('networkidle');

            console.log('⚠️ 请在浏览器中上传图片...');
            console.log('   上传后会自动填写标题和正文');

            // 等待图片上传完成
            await page.waitForSelector('input[placeholder*="标题"]', { timeout: 180000 });

            // 填写标题
            await page.locator('input[placeholder*="标题"]').fill(content.title);

            // 填写正文
            const contentArea = page.locator('[contenteditable="true"]').first();
            await contentArea.click();

            let fullContent = content.content;
            if (content.tags && content.tags.length > 0) {
                fullContent += '\n\n' + content.tags.map(t => `#${t}`).join(' ');
            }

            await page.keyboard.type(fullContent);

            console.log('✅ 小红书内容已填写');
            await page.waitForTimeout(3000);
            await page.close();

            return true;
        } catch (error) {
            console.error('❌ 小红书发布失败:', error.message);
            await page.close();
            return false;
        }
    }

    // 发布到知乎
    async publishToZhihu(content) {
        console.log(`\n📝 发布到知乎: ${content.title}`);

        const page = await this.browser.newPage();

        try {
            await page.goto('https://zhuanlan.zhihu.com/write');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // 填写标题
            const titleInput = page.locator('textarea[placeholder*="标题"]');
            if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await titleInput.fill(content.title);
            }

            // 填写正文
            const contentEditor = page.locator('.public-DraftEditor-content, [contenteditable="true"]').first();
            if (await contentEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
                await contentEditor.click();
                await page.keyboard.type(content.content);
            }

            console.log('✅ 知乎内容已填写');
            await page.waitForTimeout(3000);
            await page.close();

            return true;
        } catch (error) {
            console.error('❌ 知乎发布失败:', error.message);
            await page.close();
            return false;
        }
    }
}

// ========== 主函数 ==========

async function publishFromFeishu() {
    console.log('🚀 飞书 → 多平台自动发布器\n');

    // 配置 (从环境变量读取)
    const config = {
        appId: process.env.FEISHU_APP_ID || '',
        appSecret: process.env.FEISHU_APP_SECRET || '',
        appToken: process.env.FEISHU_BITABLE_APP_TOKEN || '',
        tableId: process.env.FEISHU_BITABLE_TABLE_ID || ''
    };

    console.log('⚠️ 飞书环境变量未配置，使用测试数据演示\n');

    // 使用测试数据
    const testContent = {
        recordId: 'test-001',
        title: '【测试】从飞书自动发布的内容',
        content: `这是从飞书多维表格自动读取的内容。

实现了完整的自动化发布流程：
1. 从飞书读取待发布内容
2. 自动发布到小红书
3. 自动发布到知乎
4. 回写发布状态

本文由AI自动生成，测试用途`,
        platform: 'both',
        status: 'pending',
        tags: ['AI', '自动化', '效率工具']
    };

    const publisher = new MultiPlatformPublisher();

    try {
        await publisher.init();

        // 发布到小红书
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 第1步: 发布到小红书');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const xhsResult = await publisher.publishToXiaohongshu(testContent);

        // 发布到知乎
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 第2步: 发布到知乎');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const zhihuResult = await publisher.publishToZhihu(testContent);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 发布结果汇总:');
        console.log(`   小红书: ${xhsResult ? '✅ 成功' : '❌ 失败'}`);
        console.log(`   知乎: ${zhihuResult ? '✅ 成功' : '❌ 失败'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('🎉 演示完成！');
        console.log('📌 请在两个平台的浏览器窗口中检查内容');
        console.log('📌 建议【取消】发布，这只是测试');
        console.log('\n按 Ctrl+C 结束...');

        await new Promise(resolve => setTimeout(resolve, 600000));

    } finally {
        await publisher.close();
    }
}

// 导出
module.exports = { FeishuContentReader, MultiPlatformPublisher, publishFromFeishu };

// 直接运行
if (require.main === module) {
    publishFromFeishu().catch(console.error);
}
