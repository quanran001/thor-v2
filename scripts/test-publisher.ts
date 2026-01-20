/**
 * 社交平台发布测试脚本
 * 用于验证Playwright环境和基础发布功能
 */

import { SocialPlatformPublisher, ContentItem } from '../lib/social-publisher';

async function testPublisher() {
    console.log('🚀 开始测试社交平台发布器\n');

    // 创建发布器实例
    const publisher = new SocialPlatformPublisher({
        headless: false,  // 显示浏览器窗口
        slowMo: 200       // 放慢操作便于观察
    });

    try {
        // 1. 初始化浏览器
        console.log('1️⃣ 初始化浏览器...');
        await publisher.init();

        // 2. 准备测试内容
        const testContent: ContentItem = {
            recordId: 'test-001',
            title: '测试标题 - 这是一篇测试笔记',
            content: `这是正文内容。

测试自动发布功能。

- 支持多段落
- 支持列表
- 支持表情 🎉`,
            images: [],
            tags: ['测试', 'AI自动化'],
            platform: 'xiaohongshu',
            status: 'pending'
        };

        // 3. 测试小红书发布
        console.log('\n2️⃣ 测试小红书发布...');
        console.log('⚠️ 如果需要登录，请在打开的浏览器窗口中手动登录');

        const result = await publisher.publishToXiaohongshu(testContent);
        console.log('小红书发布结果:', result);

        // 4. 可选: 测试知乎发布
        // console.log('\n3️⃣ 测试知乎发布...');
        // const zhihuContent = { ...testContent, platform: 'zhihu' as const };
        // const zhihuResult = await publisher.publishToZhihu(zhihuContent);
        // console.log('知乎发布结果:', zhihuResult);

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        // 5. 关闭浏览器
        console.log('\n✅ 测试完成');
        // await publisher.close();  // 暂时保持浏览器打开，方便调试
    }
}

// 运行测试
testPublisher().catch(console.error);
