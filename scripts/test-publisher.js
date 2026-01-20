/**
 * 社交平台发布测试脚本 v3 - 简化版
 * 使用已保存的登录状态，用户手动上传图片后自动填写标题和正文
 */

const { chromium } = require('playwright');

async function testPublisher() {
    console.log('🚀 开始测试社交平台发布器 v3\n');

    let browser = null;

    try {
        // 1. 使用已保存的登录状态启动浏览器
        console.log('1️⃣ 初始化浏览器...');
        browser = await chromium.launchPersistentContext('./playwright-data', {
            headless: false,
            slowMo: 50,
            viewport: { width: 1400, height: 900 }
        });

        console.log('✅ 浏览器已启动（使用保存的登录状态）\n');

        // 2. 直接访问发布页面
        console.log('2️⃣ 访问小红书发布页面...');
        const page = await browser.newPage();
        await page.goto('https://creator.xiaohongshu.com/publish/publish');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        console.log('✅ 页面已加载\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📸 请在浏览器中手动操作：');
        console.log('   1. 点击"上传图文"选项卡');
        console.log('   2. 上传一张图片');
        console.log('   3. 等待脚本自动填写内容');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 3. 等待图片上传完成（检测标题输入框出现）
        console.log('3️⃣ 等待您上传图片...');
        console.log('   (最长等待5分钟)\n');

        try {
            // 等待标题输入框出现（说明图片已上传）
            await page.waitForSelector('input[placeholder*="标题"]', { timeout: 300000 });
            console.log('✅ 检测到编辑界面！开始自动填写内容\n');
        } catch (e) {
            console.log('⏰ 等待超时，请重试');
            return;
        }

        // 4. 自动填写内容
        console.log('4️⃣ 填写测试内容...');
        await page.waitForTimeout(1000);

        // 填写标题
        const titleInput = page.locator('input[placeholder*="标题"]');
        await titleInput.fill('【测试】AI自动发布功能 - 飞书到小红书');
        console.log('   ✓ 标题已填写');

        // 填写正文
        await page.waitForTimeout(500);
        const contentArea = page.locator('[contenteditable="true"]');
        const contentElements = await contentArea.all();

        for (const el of contentElements) {
            if (await el.isVisible()) {
                await el.click();
                await page.keyboard.type(`这是一篇测试笔记 📝

AI自动发布功能测试成功！🎉

这个功能实现了：
✅ 从飞书多维表格读取内容
✅ 自动打开小红书发布页面
✅ 自动填写标题和正文

#AI自动化 #效率工具 #飞书`);
                console.log('   ✓ 正文已填写');
                break;
            }
        }

        console.log('\n🎉🎉🎉 测试成功！内容已自动填写！🎉🎉🎉');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 请在浏览器中检查内容');
        console.log('📌 这是测试，建议【取消】不要真的发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 5. 保持浏览器打开让用户检查
        console.log('5️⃣ 浏览器保持打开，请检查内容后关闭');
        console.log('   按 Ctrl+C 结束脚本\n');

        await new Promise(resolve => setTimeout(resolve, 600000)); // 10分钟

    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        if (browser) {
            console.log('\n🔄 关闭浏览器...');
            await browser.close();
        }
        console.log('✅ 测试结束');
    }
}

testPublisher().catch(console.error);
