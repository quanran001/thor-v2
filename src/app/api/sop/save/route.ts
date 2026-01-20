
import { NextResponse } from 'next/server';
import { addRecordToBitable } from '@/lib/feishu';

export async function POST(req: Request) {
    try {
        const { sopData } = await req.json();

        if (!sopData) {
            return NextResponse.json({ error: 'Missing sopData' }, { status: 400 });
        }

        const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
        const tableId = process.env.FEISHU_TABLE_ID_SOP_BLUEPRINTS; // Specific table ID env var

        if (!appToken || !tableId) {
            console.warn('Feishu/Bitable config missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Map to Feishu Fields
        // Ensure sopData is stringified for content_json field
        const fields = {
            "title": sopData.title || "Untitled SOP",
            "content_json": JSON.stringify(sopData),
            "create_time": Date.now(), // Feishu might want timestamp or formatted string? Timestamp usually works
            // "user_id": "anonymous" // For now
        };

        const result = await addRecordToBitable(appToken, tableId, fields);

        return NextResponse.json({ success: true, recordId: result?.record?.record_id });

    } catch (error) {
        console.error('Save API Error:', error);
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
}
