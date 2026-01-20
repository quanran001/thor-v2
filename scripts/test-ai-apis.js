/**
 * Test AI API Keys
 * Run: node scripts/test-ai-apis.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testDeepSeek() {
    console.log('\n=== Testing DeepSeek API ===');
    const apiKey = process.env.DEEPSEEK_API_KEY;
    console.log('Key (masked):', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'NOT SET');

    if (!apiKey) {
        console.error('❌ DEEPSEEK_API_KEY not configured');
        return false;
    }

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: 'Hello, respond with just "OK"' }],
                max_tokens: 10
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ DeepSeek API working!');
            console.log('Response:', data.choices?.[0]?.message?.content);
            return true;
        } else {
            console.error('❌ DeepSeek API error:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ DeepSeek connection error:', error.message);
        return false;
    }
}

async function testYunwuAI() {
    console.log('\n=== Testing Yunwu.ai API ===');
    const apiKey = process.env.BACKUP_API_KEY || 'sk-M3lchZQRl9nooSwyb1pV3Hkix3sLs8Bgbyy1tdfRR3K57fXE';
    console.log('Key (masked):', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

    try {
        const response = await fetch('https://yunwu.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4',
                messages: [{ role: 'user', content: 'Hello, respond with just "OK"' }],
                max_tokens: 10
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Yunwu.ai API working!');
            console.log('Response:', data.choices?.[0]?.message?.content);
            return true;
        } else {
            console.error('❌ Yunwu.ai API error:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Yunwu.ai connection error:', error.message);
        return false;
    }
}

async function main() {
    console.log('Testing AI API Keys...');

    const deepseekOk = await testDeepSeek();
    const yunwuOk = await testYunwuAI();

    console.log('\n=== Summary ===');
    console.log('DeepSeek:', deepseekOk ? '✅ Working' : '❌ Failed');
    console.log('Yunwu.ai:', yunwuOk ? '✅ Working' : '❌ Failed');

    if (!deepseekOk && !yunwuOk) {
        console.log('\n⚠️  Both APIs failed. Please check your API keys.');
    }
}

main();
