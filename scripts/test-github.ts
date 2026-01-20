/**
 * GitHub Integration Test Script
 * Run with: npx tsx scripts/test-github.ts (from project root)
 * Or: npx tsx test-github.ts (from scripts folder)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
config({ path: resolve(__dirname, '..', '.env.local') });

const GITHUB_API_BASE = 'https://api.github.com';

async function testGitHubConnection() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    console.log('🔍 检查配置...');
    console.log(`   GITHUB_OWNER: ${owner || '❌ 未配置'}`);
    console.log(`   GITHUB_REPO: ${repo || '❌ 未配置'}`);
    console.log(`   GITHUB_TOKEN: ${token ? '✅ 已配置' : '❌ 未配置'}`);

    if (!token || !owner || !repo) {
        console.log('\n❌ 配置不完整，请检查 .env.local 文件');
        return;
    }

    // Test 1: Check repo access
    console.log('\n📡 测试仓库访问...');
    try {
        const repoResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'SOP-Alchemist-Test'
            }
        });

        if (!repoResponse.ok) {
            const error = await repoResponse.json();
            console.log(`❌ 仓库访问失败: ${error.message}`);
            return;
        }

        const repoData = await repoResponse.json();
        console.log(`✅ 仓库访问成功!`);
        console.log(`   仓库全名: ${repoData.full_name}`);
        console.log(`   私有仓库: ${repoData.private ? '是' : '否'}`);
    } catch (error) {
        console.log(`❌ 网络错误: ${error}`);
        return;
    }

    // Test 2: Upload a test file
    console.log('\n📤 测试文件上传...');
    const testPath = `test/connection-test-${Date.now()}.txt`;
    const testContent = `GitHub Integration Test\nTimestamp: ${new Date().toISOString()}\nFrom: SOP Alchemist Platform`;

    try {
        const uploadResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${testPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'SOP-Alchemist-Test',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'test: GitHub integration connection test',
                content: Buffer.from(testContent).toString('base64')
            })
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            console.log(`❌ 文件上传失败: ${error.message}`);
            return;
        }

        const uploadData = await uploadResponse.json();
        console.log(`✅ 文件上传成功!`);
        console.log(`   文件路径: ${testPath}`);
        console.log(`   查看链接: ${uploadData.content?.html_url}`);
    } catch (error) {
        console.log(`❌ 上传错误: ${error}`);
        return;
    }

    console.log('\n🎉 所有测试通过! GitHub 集成配置正确。');
}

testGitHubConnection();
