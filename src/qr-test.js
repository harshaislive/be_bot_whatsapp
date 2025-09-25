import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

console.log('🔧 Starting QR Code Test...\n');

// Simple test flow
const testFlow = addKeyword(['hello', 'hi'])
    .addAnswer('✅ Bot is working! You successfully connected to WhatsApp.');

async function testQRCode() {
    try {
        console.log('📱 Initializing WhatsApp provider...');

        // Create provider with explicit QR handling
        const provider = createProvider(BaileysProvider);

        // Multiple event listeners for debugging
        provider.on('qr', async (qr) => {
            console.log('\n🎉 QR EVENT TRIGGERED!\n');
            console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
            console.log('═'.repeat(50));

            // Display in terminal
            qrcode.generate(qr, { small: true });

            // Save to file as backup
            try {
                await QRCode.toFile('qr-code.png', qr);
                console.log('\n💾 QR code saved to: qr-code.png');
            } catch (error) {
                console.log('⚠️ Could not save QR file:', error.message);
            }

            console.log('═'.repeat(50));
            console.log('📱 WhatsApp → Settings → Linked Devices → Link Device');
            console.log('⏰ QR expires in 20 seconds!');
            console.log('═'.repeat(50));
        });

        provider.on('ready', (info) => {
            console.log('\n✅ CONNECTED TO WHATSAPP!');
            console.log('📞 Phone:', info);
            console.log('🤖 Send "hello" to test the bot');
        });

        provider.on('auth_failure', (error) => {
            console.log('\n❌ Authentication failed:', error);
        });

        provider.on('disconnected', () => {
            console.log('\n🔌 Disconnected from WhatsApp');
        });

        // Create minimal flow
        const flow = createFlow([testFlow]);

        // Create bot
        const bot = createBot({
            flow,
            provider,
            database: null // No database needed for test
        });

        console.log('⚡ Bot created. Waiting for QR code...\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Handle exit gracefully
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping QR test...');
    process.exit(0);
});

testQRCode();