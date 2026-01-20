/**
 * Feishu Database Setup Script
 * Creates the required tables for SOP Alchemist in a Feishu Base (多维表格)
 * 
 * Usage: node scripts/setup_feishu_db.js
 */

require('dotenv').config({ path: '.env.local' });

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

let accessToken = null;

/**
 * Get tenant access token from Feishu
 */
async function getTenantAccessToken() {
  const response = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get access token: ${data.msg}`);
  }
  console.log('✅ Access token obtained successfully');
  return data.tenant_access_token;
}

/**
 * Create a new table in the Feishu Base
 */
async function createTable(tableName, fields) {
  const response = await fetch(`${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      table: {
        name: tableName,
        default_view_name: '默认视图',
        fields: fields,
      },
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    console.error(`❌ Failed to create table "${tableName}": ${data.msg} (Code: ${data.code})`);
    return null;
  }
  console.log(`✅ Table "${tableName}" created successfully (ID: ${data.data.table_id})`);
  return data.data.table_id;
}

/**
 * Table definitions based on V3.5 spec
 */
const TABLES = [
  {
    name: 'Users (用户表)',
    fields: [
      { field_name: 'user_id', type: 1 },        // Text
      { field_name: 'phone', type: 1 },          // Text (phone type not available via API, use text)
      { field_name: 'nickname', type: 1 },       // Text
      { field_name: 'company', type: 1 },        // Text
      { field_name: 'status', type: 3, property: { options: [{ name: '活跃' }, { name: '休眠' }, { name: '拉黑' }] } }, // Single Select
      { field_name: 'source', type: 3, property: { options: [{ name: '自然流量' }, { name: '邀请' }, { name: '广告' }] } }, // Single Select
      { field_name: 'created_at', type: 5 },     // DateTime
    ],
  },
  {
    name: 'SOP_Blueprints (蓝图表)',
    fields: [
      { field_name: 'blueprint_id', type: 1 },    // Text
      { field_name: 'user_id', type: 1 },         // Text (will be used to link to Users)
      { field_name: 'title', type: 1 },           // Text
      { field_name: 'content_json', type: 1 },    // Text (long text for JSON)
      { field_name: 'summary', type: 1 },         // Text
      { field_name: 'score_5d', type: 2 },        // Number
      { field_name: 'created_at', type: 5 },      // DateTime
    ],
  },
  {
    name: 'Orders (订单表)',
    fields: [
      { field_name: 'order_id', type: 1 },        // Text
      { field_name: 'blueprint_id', type: 1 },    // Text
      { field_name: 'status', type: 3, property: { options: [
        { name: '待报价' }, { name: '待支付' }, { name: '开发中' },
        { name: '待交付' }, { name: '试用中' }, { name: '已完成' }, { name: '已取消' }
      ] } }, // Single Select
      { field_name: 'price_level', type: 3, property: { options: [{ name: 'L1' }, { name: 'L2' }, { name: 'L3' }] } }, // Single Select
      { field_name: 'amount', type: 2 },          // Number (currency not directly supported)
      { field_name: 'payment_status', type: 3, property: { options: [{ name: '未支付' }, { name: '已付预款' }, { name: '已付尾款' }] } }, // Single Select
      { field_name: 'skill_version', type: 1 },   // Text
      { field_name: 'commit_id', type: 1 },       // Text
      { field_name: 'cos_url', type: 15 },        // URL
      { field_name: 'delivery_date', type: 5 },   // DateTime
    ],
  },
];

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Feishu Database Setup...\n');

  // Validate environment
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_TOKEN) {
    console.error('❌ Missing Feishu credentials in .env.local');
    process.exit(1);
  }
  console.log(`📦 Target Base: ${FEISHU_BASE_TOKEN}`);

  // Get access token
  try {
    accessToken = await getTenantAccessToken();
  } catch (error) {
    console.error(`❌ Authentication failed: ${error.message}`);
    process.exit(1);
  }

  // Create tables
  console.log('\n📝 Creating tables...\n');
  const results = {};
  for (const table of TABLES) {
    const tableId = await createTable(table.name, table.fields);
    results[table.name] = tableId;
  }

  // Summary
  console.log('\n--- Summary ---');
  for (const [name, id] of Object.entries(results)) {
    console.log(`  ${id ? '✅' : '❌'} ${name}: ${id || 'Failed'}`);
  }
  console.log('\n🎉 Setup complete!');
}

main().catch(console.error);
