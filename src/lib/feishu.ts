
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    disableTokenCache: false,
});

export const FeishuClient = client;

// Helper to add record to Bitable
export async function addRecordToBitable(appToken: string, tableId: string, fields: any) {
    try {
        const res = await client.bitable.appTableRecord.create({
            path: {
                app_token: appToken,
                table_id: tableId,
            },
            data: {
                fields: fields,
            },
        });

        if (res.code !== 0) {
            console.error('Feishu API Error:', res.msg);
            throw new Error(res.msg);
        }

        return res.data;
    } catch (error) {
        console.error('Feishu Save Failed:', error);
        throw error;
    }
}
