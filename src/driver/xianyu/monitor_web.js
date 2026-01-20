const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Launching Browser for Xianyu Web Monitor (Multi-Tab Support)...');

    // Launch persistent context so login session might be saved
    // args: disable webdriver to be stealthier
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🔗 Navigating to Xianyu...');
    try {
        await page.goto('https://www.goofish.com/', { waitUntil: 'domcontentloaded' });
    } catch (e) { console.log("Nav error (might be network/proxy):", e.message); }

    console.log('👉 Please LOGIN and OPEN CHAT manually.');
    console.log('🕵️  I am scanning ALL OPEN TABS every 3 seconds...');

    // Loop to inspect ALL pages
    setInterval(async () => {
        try {
            const pages = context.pages();
            console.log(`\n--- Scanning ${pages.length} Tab(s) ---`);

            for (const [index, p] of pages.entries()) {
                try {
                    const title = await p.title();
                    const url = p.url();
                    console.log(`[Tab ${index}] ${title.substring(0, 30)}... | ${url.substring(0, 40)}...`);

                    // Check specifically for Chat Indicators
                    if (url.includes('im') || url.includes('chat') || title.includes('消息') || title.includes('聊天')) {
                        console.log(`   🎯 >>> FOUND CHAT TAB! <<<`);

                        // Simple Dump of potential chat classes
                        const structure = await p.evaluate(() => {
                            const divs = Array.from(document.querySelectorAll('div[class*="message"], div[class*="chat"], div[class*="bubble"]'));
                            return divs.map(d => d.className).slice(0, 5);
                        });
                        console.log("   Potential Chat Classes:", structure);
                    }
                } catch (err) {
                    // Page closed or navigated during check
                }
            }
        } catch (e) {
            console.log('   (Browser error...)');
        }
    }, 3000);

    // Keep alive
})();
