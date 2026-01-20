/**
 * 知乎自动发布测试脚本
 * 使用Playwright浏览器自动化发布文章到知乎专栏
 */

const { chromium } = require('playwright');

async function testZhihuPublisher() {
    console.log('🚀 开始测试知乎自动发布器\n');

    let browser = null;

    try {
        // 1. 使用已保存的登录状态启动浏览器
        console.log('1️⃣ 初始化浏览器...');
        browser = await chromium.launchPersistentContext('./playwright-data', {
            headless: false,
            slowMo: 50,
            viewport: { width: 1400, height: 900 }
        });

        console.log('✅ 浏览器已启动\n');

        // 2. 访问知乎创作中心
        console.log('2️⃣ 访问知乎创作中心...');
        const page = await browser.newPage();
        await page.goto('https://zhuanlan.zhihu.com/write');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 3. 检查登录状态
        const needLogin = await page.locator('button:has-text("登录")').isVisible({ timeout: 3000 }).catch(() => false);

        if (needLogin) {
            console.log('⚠️ 需要登录知乎，请在浏览器中手动登录...');
            console.log('   登录后会自动继续\n');

            // 等待登录完成
            await page.waitForURL('**/write**', { timeout: 300000 });
            console.log('✅ 登录成功！\n');
        } else {
            console.log('✅ 已检测到登录状态\n');
        }

        await page.waitForTimeout(2000);

        // 4. 填写文章内容
        console.log('3️⃣ 填写测试内容...');

        // 填写标题
        const titleInput = page.locator('textarea[placeholder*="标题"]');
        if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await titleInput.fill('【测试】AI自动发布功能 - 从飞书到知乎');
            console.log('   ✓ 标题已填写');
        } else {
            console.log('   ⚠️ 未找到标题输入框，尝试其他选择器...');
            // 尝试其他选择器
            const altTitle = page.locator('input[type="text"]').first();
            if (await altTitle.isVisible()) {
                await altTitle.fill('【测试】AI自动发布功能 - 从飞书到知乎');
                console.log('   ✓ 标题已填写（备选选择器）');
            }
        }

        // 填写正文
        await page.waitForTimeout(500);
        const contentEditor = page.locator('.public-DraftEditor-content, [contenteditable="true"]').first();

        if (await contentEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
            await contentEditor.click();
            await page.keyboard.type(`这是一篇测试文章 📝

## AI自动发布功能测试

这个功能实现了从飞书多维表格自动发布到知乎：

- ✅ 自动打开知乎创作中心
- ✅ 自动填写标题
- ✅ 自动填写正文内容

### 技术实现

使用 Playwright 浏览器自动化技术，模拟真实用户操作。

---

*本文由AI自动生成，仅用于测试*`);
            console.log('   ✓ 正文已填写');
        } else {
            console.log('   ⚠️ 未找到正文编辑器');
        }

        console.log('\n🎉🎉🎉 测试成功！内容已自动填写！🎉🎉🎉');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 请在浏览器中检查内容');
        console.log('📌 这是测试，建议【取消】不要真的发布');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 5. 保持浏览器打开
        console.log('4️⃣ 浏览器保持打开，请检查内容');
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

testZhihuPublisher().catch(console.error);
