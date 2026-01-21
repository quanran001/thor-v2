import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from './prompts';

const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com',
});


export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'No message provided' }, { status: 400 });
        }

        const contextMessages = Array.isArray(history) ? history.slice(-10) : [];

        // Type safety: ensure messages match OpenAI format
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...contextMessages.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content
            })),
            { role: 'user', content: message }
        ];

        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: messages,
            response_format: { type: 'json_object' },
            temperature: 0.6,
        });

        const content = response.choices[0].message.content || '{}';
        console.log('DeepSeek Raw Response:', content);

        try {
            // Robust JSON Extraction: Find first '{' and last '}'
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = content.substring(jsonStart, jsonEnd + 1);
                return NextResponse.json(JSON.parse(jsonStr));
            } else {
                throw new Error("No JSON found in response");
            }
        } catch (e) {
            console.error('JSON Parse Failed. Raw content:', content);
            // Fallback: treat raw text as a chat message
            return NextResponse.json({
                type: 'chat',
                message: content || "系统繁忙，请重试"
            });
        }

    } catch (error) {
        console.error('SOP Generation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
