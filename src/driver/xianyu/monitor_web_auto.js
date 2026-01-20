const { chromium } = require('playwright');
const axios = require('axios');

// Configuration
const BRAIN_API = "http://localhost:3001/api/chat";

(async () => {
    console.log('🤖 Starting Xianyu Web Auto-Bot (v2 - Anti-Loop)...');

    // Launch Chrome (Headful)
    // Using existing user data path could be better, but for now pure instance
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try { await page.goto('https://www.goofish.com/'); } catch (e) { }

    console.log('👉 Please LOGIN and OPEN CHAT tab manually.');

    let lastProcessedMsg = "";
    let chatPage = null;

    // Main Loop
    setInterval(async () => {
        // 1. Find Chat Tab
        if (!chatPage || chatPage.isClosed()) {
            const pages = context.pages();
            for (const p of pages) {
                const url = p.url();
                if (url.includes('im') || url.includes('chat')) {
                    chatPage = p;
                    console.log(`✅ Hooked Chat Page: ${url}`);
                    break;
                }
            }
        }

        if (!chatPage) return;

        // 2. Scan & Act
        try {
            const data = await chatPage.evaluate(() => {
                // Find all message rows
                const rows = Array.from(document.querySelectorAll('div[class*="message-row"]'));
                if (rows.length === 0) return null;

                const lastRow = rows[rows.length - 1];

                // Content Extraction
                // Try to find text container. Usually has class like 'content' or just div inside bubble
                // We grab all text in the row to be safe
                const text = lastRow.innerText.replace(/\n/g, ' ').trim();

                // --- IS MINE DETECTION (Critical) ---
                // Method 1: Check computed style for 'flex-direction: row-reverse' or 'justify-content: flex-end'
                const style = window.getComputedStyle(lastRow);
                const isRightAligned = (style.flexDirection === 'row-reverse' || style.justifyContent === 'flex-end');

                // Method 2: Check class name for 'me' or 'reverse'
                const hasMeClass = lastRow.className.includes('me') || lastRow.className.includes('reverse');

                // Method 3: Check Bubble Position (Right side of screen)
                const rect = lastRow.getBoundingClientRect();
                const parentRect = lastRow.parentElement ? lastRow.parentElement.getBoundingClientRect() : { width: 1000 };
                // If the element's center is on the right half of its container
                const isPositionRight = (rect.left + rect.width / 2) > (parentRect.width / 2);

                // Combined Verdict
                const isMine = isRightAligned || hasMeClass || isPositionRight;

                // Input Box
                let inputSel = 'textarea';
                if (!document.querySelector(inputSel)) inputSel = 'input[type="text"]';
                if (!document.querySelector(inputSel)) inputSel = '[contenteditable="true"]';

                return {
                    lastText: text,
                    isMine: isMine,
                    inputSelector: inputSel,
                    debug: { isRightAligned, hasMeClass, isPositionRight, rectLeft: rect.left }
                };
            });

            if (!data) return; // No messages

            const { lastText, isMine, inputSelector, debug } = data;

            // Only process if TEXT CHANGED
            if (lastText && lastText !== lastProcessedMsg) {

                console.log(`--------------------------------------------------`);
                console.log(`📩 Read: "${lastText.substring(0, 20)}..."`);
                console.log(`   Is Mine? ${isMine} (Pos:${Math.round(debug.rectLeft)})`);

                // Update "Last Processed" immediately to avoid multi-trigger
                lastProcessedMsg = lastText;

                // CRITICAL: STOP IF IT'S MINE
                if (isMine) {
                    console.log(`✋ Ignored (My Message)`);
                    return;
                }

                // Only reply to OTHERS
                console.log("🧠 Asking Brain...");
                try {
                    const res = await axios.post(BRAIN_API, { message: lastText });
                    let reply = res.data.reply;

                    // Cleanup Reply (remove markdown, "SoleBot:", etc)
                    reply = reply.replace(/^SoleBot:/i, "").replace(/"/g, "");

                    console.log(`🗣️ Replying: "${reply}"`);

                    // Action: Type & Send
                    await chatPage.fill(inputSelector, reply);
                    await chatPage.waitForTimeout(800);

                    // Click Send Button (Look for "发送" or "Send")
                    const sendBtn = chatPage.getByText('发送', { exact: true }).first();
                    if (await sendBtn.count() > 0) {
                        await sendBtn.click();
                        console.log("✅ Clicked Send");
                    } else {
                        await chatPage.press(inputSelector, 'Enter');
                        console.log("✅ Pressed Enter");
                    }

                } catch (err) {
                    console.error("❌ Brain/Network Error:", err.message);
                }
            }

        } catch (e) {
            // console.log("Scan error:", e.message);
        }

    }, 3000);

})();
