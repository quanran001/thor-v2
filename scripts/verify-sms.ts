
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
// console.log(`Loading env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.local:', result.error);
}

async function main() {
    // Dynamic import to ensure env vars are loaded BEFORE the module is evaluated
    const { sendVerificationCode, generateCode } = await import('../lib/aliyun-sms');

    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Please provide a phone number.');
        console.error('Usage: npx tsx scripts/verify-sms.ts <PHONE_NUMBER>');
        process.exit(1);
    }

    const phone = args[0];
    const code = generateCode();

    console.log(`Sending verification code ${code} to ${phone}...`);
    console.log('Ensure this is a China Unicom number (130, 131, 132, 145, 155, 156, 166, 175, 176, 185, 186) for signature verification.');

    const success = await sendVerificationCode(phone, code);

    if (success) {
        console.log('✅ SMS sent successfully!');
    } else {
        console.error('❌ Failed to send SMS. Check your credentials and signature status.');
    }
}

main().catch(console.error);
