const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

async function getAccessToken() {
    console.log('1. Getting Tenant Access Token...');
    try {
        const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
            app_id: APP_ID,
            app_secret: APP_SECRET
        });
        console.log('   ✅ Token Acquired.');
        return res.data.tenant_access_token;
    } catch (e) {
        console.error('   ❌ Token Failed:', e.message);
        process.exit(1);
    }
}

async function debugPermissions() {
    console.log(`\n🔍 Debugging Permissions for App ID: [${APP_ID}]`);
    console.log('Please verify this ID matches the app you are configuring in Feishu Console.\n');

    const token = await getAccessToken();
    let rootFolderToken = '';

    // Test 1: Get Root Folder Meta (Requires 'drive:read' or 'drive:drive')
    console.log('2. Probing Drive API (Get Root Folder)...');
    try {
        const res = await axios.get('https://open.feishu.cn/open-apis/drive/v1/files/root_folder', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.code === 0) {
            rootFolderToken = res.data.data.token;
            console.log(`   ✅ Success! Root Token: ${rootFolderToken}`);
            console.log('   (Drive Read permission confirms app can see file system)');
        } else {
            console.error('   ❌ Drive Fail:', JSON.stringify(res.data));
        }
    } catch (e) {
        console.error('   ❌ API Error:', e.message);
    }

    // Test 2: Create a Folder (Requires 'drive:drive')
    console.log('\n3. Probing Drive Write (Create Folder)...');
    let testFolderToken = '';
    if (rootFolderToken) {
        try {
            const res = await axios.post('https://open.feishu.cn/open-apis/drive/v1/files/create_folder', {
                folder_token: rootFolderToken,
                name: "Antigravity_Debug_Folder"
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.code === 0) {
                testFolderToken = res.data.data.token;
                console.log(`   ✅ Success! Created Folder: ${testFolderToken}`);
                console.log('   (Drive Write permission confirms app can create files)');
            } else {
                console.error('   ❌ Create Folder Fail:', JSON.stringify(res.data));
            }
        } catch (e) {
            console.error('   ❌ API Error:', e.message);
        }
    } else {
        console.log('   ⚠️ Start skipped (No Root Token).');
    }

    // Test 3: Create DocX (Requires 'docx:document:user_edit')
    console.log('\n4. Probing DocX API (Create Doc)...');
    try {
        // Try creating in the test folder if available, otherwise root
        const targetToken = testFolderToken || rootFolderToken || "";
        console.log(`   Target Folder: ${targetToken ? targetToken : "App Root (Explicit Empty)"}`);

        const res = await axios.post('https://open.feishu.cn/open-apis/docx/v1/documents', {
            folder_token: targetToken,
            title: "Permission Probe Doc"
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.code === 0) {
            console.log(`   ✅ Success! Doc Created: ${res.data.data.document.document_id}`);
            console.log('   (DocX Permission is GOOD!)');
        } else {
            console.error('   ❌ Create Doc Fail:', JSON.stringify(res.data));
            console.log('   Note: Code 99991672 = Scopes Missing');
        }
    } catch (e) {
        console.error('   ❌ API Error:', e.message);
    }
}

debugPermissions();
