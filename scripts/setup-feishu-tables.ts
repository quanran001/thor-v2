/**
 * Feishu Table Setup Script
 * Creates Orders and Notifications tables in Feishu Base
 * 
 * Run with: npx tsx scripts/setup-feishu-tables.ts
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
    console.log('=== Feishu Table Setup ===\n');

    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_TOKEN) {
        console.error('Error: Missing Feishu credentials in .env.local');
        console.error('Required: FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_TOKEN');
        process.exit(1);
    }

    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained.\n');

    // Field type mapping:
    // 1 = Text, 2 = Number, 3 = Single Select, 5 = Date, 7 = Checkbox, 11 = Link, 17 = Attachment

    // Create Orders table
    const ordersFields = [
        { field_name: 'order_id', type: 1 },  // Text
        { field_name: 'user_id', type: 1 },   // Text (will be linked later)
        { field_name: 'blueprint_id', type: 1 }, // Text
        {
            field_name: 'status',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: '待评估', color: 0 },
                    { name: '待付款', color: 1 },
                    { name: '制作中', color: 2 },
                    { name: '交付中', color: 3 },
                    { name: '已完成', color: 4 },
                    { name: '售后中', color: 5 },
                ]
            }
        },
        {
            field_name: 'level',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: 'L1', color: 0 },
                    { name: 'L2', color: 1 },
                    { name: 'L3', color: 2 },
                ]
            }
        },
        { field_name: 'estimated_duration', type: 2 },  // Number
        { field_name: 'ai_estimation_price', type: 1 }, // Text
        { field_name: 'final_contract_price', type: 2 }, // Number
        { field_name: 'contract_file', type: 17 },  // Attachment
        { field_name: 'created_at', type: 5 },  // Date
    ];

    const ordersTableId = await createTable(accessToken, 'Orders', ordersFields);

    // Create Notifications table
    const notificationsFields = [
        { field_name: 'notify_id', type: 1 },  // Text
        { field_name: 'order_id', type: 1 },   // Text
        { field_name: 'user_id', type: 1 },    // Text
        {
            field_name: 'channel',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: 'SMS', color: 0 },
                    { name: 'Email', color: 1 },
                    { name: 'Feishu', color: 2 },
                ]
            }
        },
        { field_name: 'content_snapshot', type: 1 }, // Text
        { field_name: 'send_time', type: 5 },  // Date
        {
            field_name: 'user_action',
            type: 3,  // Single Select
            property: {
                options: [
                    { name: '未读', color: 0 },
                    { name: '已读', color: 1 },
                    { name: '已点击链接', color: 2 },
                ]
            }
        },
    ];

    const notificationsTableId = await createTable(accessToken, 'Notifications', notificationsFields);

    console.log('\n=== Setup Complete ===');
    console.log('\nAdd these to your .env.local:');
    if (ordersTableId) {
        console.log(`FEISHU_ORDERS_TABLE_ID=${ordersTableId}`);
    }
    if (notificationsTableId) {
        console.log(`FEISHU_NOTIFICATIONS_TABLE_ID=${notificationsTableId}`);
    }
}

main().catch(console.error);
