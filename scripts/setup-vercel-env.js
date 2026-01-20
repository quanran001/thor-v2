#!/usr/bin/env node
/**
 * Vercel Environment Variables Setup Script
 * Run: node scripts/setup-vercel-env.js
 * 
 * Prerequisites: npm install -g vercel && vercel login
 */

const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Environment variables to set (production only)
const envVars = {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEV_MODE: 'false', // Always false for production
    REDIS_URL: process.env.REDIS_URL,
    FEISHU_APP_ID: process.env.FEISHU_APP_ID,
    FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET,
    FEISHU_BASE_TOKEN: process.env.FEISHU_BASE_TOKEN,
    FEISHU_ORDERS_TABLE_ID: process.env.FEISHU_ORDERS_TABLE_ID,
    FEISHU_NOTIFICATIONS_TABLE_ID: process.env.FEISHU_NOTIFICATIONS_TABLE_ID,
    FEISHU_PRODUCERS_TABLE_ID: process.env.FEISHU_PRODUCERS_TABLE_ID,
    FEISHU_BIDDING_TABLE_ID: process.env.FEISHU_BIDDING_TABLE_ID,
    FEISHU_PRODUCTION_TABLE_ID: process.env.FEISHU_PRODUCTION_TABLE_ID,
    ALIYUN_ACCESS_KEY_ID: process.env.ALIYUN_ACCESS_KEY_ID,
    ALIYUN_ACCESS_KEY_SECRET: process.env.ALIYUN_ACCESS_KEY_SECRET,
    ALIYUN_SMS_SIGN: process.env.ALIYUN_SMS_SIGN,
    ALIYUN_SMS_TEMPLATE_CODE: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    JWT_SECRET: process.env.JWT_SECRET,
    FEISHU_WEBHOOK_URL: process.env.FEISHU_WEBHOOK_URL,
    TENCENT_COS_SECRET_ID: process.env.TENCENT_COS_SECRET_ID,
    TENCENT_COS_SECRET_KEY: process.env.TENCENT_COS_SECRET_KEY,
    TENCENT_COS_BUCKET: process.env.TENCENT_COS_BUCKET,
    TENCENT_COS_REGION: process.env.TENCENT_COS_REGION,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
};

console.log('🚀 Setting up Vercel environment variables...\n');

let successCount = 0;
let failCount = 0;

for (const [name, value] of Object.entries(envVars)) {
    if (!value) {
        console.log(`⏭️  Skipping ${name} (empty value)`);
        continue;
    }
    
    try {
        // Use echo to pipe value to avoid shell escaping issues
        const cmd = `echo "${value}" | vercel env add ${name} production`;
        execSync(cmd, { stdio: 'pipe', shell: true });
        console.log(`✅ ${name}`);
        successCount++;
    } catch (error) {
        // Try with --force if already exists
        try {
            const cmd = `echo "${value}" | vercel env rm ${name} production -y && echo "${value}" | vercel env add ${name} production`;
            execSync(cmd, { stdio: 'pipe', shell: true });
            console.log(`✅ ${name} (replaced)`);
            successCount++;
        } catch (e) {
            console.log(`❌ ${name}: ${error.message}`);
            failCount++;
        }
    }
}

console.log(`\n📊 Results: ${successCount} success, ${failCount} failed`);
console.log('\n💡 Run "vercel --prod" to deploy with these variables.');
