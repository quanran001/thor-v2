/**
 * Feishu Table Setup Script - Phase 3
 * Creates Producers, Bidding_Records, Skill_Production tables
 * 
 * Run with: npx tsx scripts/setup-feishu-tables-p3.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN;

async function getAccessToken(): Promise<string> {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
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
    return data.tenant_access_token;
}

async function createTable(accessToken: string, tableName: string, fields: Array<{ field_name: string; type: number; property?: object }>) {
    console.log(`Creating table: ${tableName}...`);

    const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables`,
        {
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
        }
    );

    const result = await response.json();

    if (result.code !== 0) {
        if (result.code === 1254043) {
            console.log(`  Table "${tableName}" already exists, skipping...`);
            return null;
        }
        throw new Error(`Failed to create table ${tableName}: ${result.msg}`);
    }

    console.log(`  Created table: ${tableName} (ID: ${result.data.table_id})`);
    return result.data.table_id;
}

async function main() {
    console.log('=== Feishu Phase 3 Table Setup ===\n');

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_TOKEN) {
        console.error('Error: Missing Feishu credentials in .env.local');
        process.exit(1);
    }

    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained.\n');

    // Field type mapping:
    // 1 = Text, 2 = Number, 3 = Single Select, 5 = Date, 7 = Checkbox, 11 = Link, 17 = Attachment

    // Create Producers table - 技术人员表
    const producersFields = [
        { field_name: 'producer_id', type: 1 },  // Text, Primary key
        { field_name: 'name', type: 1 },         // Text
        { field_name: 'phone', type: 1 },        // Text (phone)
        { field_name: 'email', type: 1 },        // Text
        { field_name: 'credit_score', type: 2 }, // Number, 0-100
        { field_name: 'completed_orders', type: 2 }, // Number
        { field_name: 'avg_quality_score', type: 2 }, // Number
        { field_name: 'is_active', type: 7 },    // Checkbox
        { field_name: 'specialties', type: 1 },  // Text (JSON array)
        { field_name: 'created_at', type: 5 },   // Date
    ];

    const producersTableId = await createTable(accessToken, 'Producers', producersFields);

    // Create Bidding_Records table - 竞标记录表
    const biddingFields = [
        { field_name: 'bid_id', type: 1 },       // Text, Primary key
        { field_name: 'order_id', type: 1 },     // Text (link to Orders)
        { field_name: 'producer_id', type: 1 },  // Text (link to Producers)
        { field_name: 'bid_price', type: 2 },    // Number, CNY
        { field_name: 'bid_time', type: 5 },     // Date
        { field_name: 'estimated_days', type: 2 }, // Number
        { field_name: 'proposal', type: 1 },     // Text, brief proposal
        { field_name: 'is_winner', type: 7 },    // Checkbox
        {
            field_name: 'status',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: '待审核', color: 0 },
                    { name: '已中标', color: 1 },
                    { name: '未中标', color: 2 },
                    { name: '已取消', color: 3 },
                ]
            }
        },
    ];

    const biddingTableId = await createTable(accessToken, 'Bidding_Records', biddingFields);

    // Create Skill_Production table - 制作追踪表
    const productionFields = [
        { field_name: 'production_id', type: 1 },  // Text, Primary key
        { field_name: 'order_id', type: 1 },       // Text (link to Orders)
        { field_name: 'producer_id', type: 1 },    // Text (link to Producers)
        { field_name: 'start_time', type: 5 },     // Date
        { field_name: 'end_time', type: 5 },       // Date (nullable)
        { field_name: 'revision_count', type: 2 }, // Number
        { field_name: 'acceptance_report', type: 17 }, // Attachment
        { field_name: 'quality_score', type: 2 },  // Number 0-100
        { field_name: 'score_detail', type: 1 },   // Text (JSON)
        { field_name: 'delivery_url', type: 1 },   // Text (COS URL)
        { field_name: 'github_archive_url', type: 1 }, // Text
        {
            field_name: 'status',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: '制作中', color: 0 },
                    { name: '待验收', color: 1 },
                    { name: '修订中', color: 2 },
                    { name: '已完成', color: 3 },
                ]
            }
        },
    ];

    const productionTableId = await createTable(accessToken, 'Skill_Production', productionFields);

    console.log('\n=== Phase 3 Setup Complete ===');
    console.log('\nAdd these to your .env.local:');
    if (producersTableId) {
        console.log(`FEISHU_PRODUCERS_TABLE_ID=${producersTableId}`);
    }
    if (biddingTableId) {
        console.log(`FEISHU_BIDDING_TABLE_ID=${biddingTableId}`);
    }
    if (productionTableId) {
        console.log(`FEISHU_PRODUCTION_TABLE_ID=${productionTableId}`);
    }
}

main().catch(console.error);
