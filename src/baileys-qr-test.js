import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

console.log('🚀 Testing Baileys QR Code Generation\n');

async function startWhatsApp() {
    try {
        console.log('📱 Initializing WhatsApp connection...');

        const { state, saveCreds } = await useMultiFileAuthState('./wa_session');

        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false, // We'll handle it ourselves
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n🎉 QR CODE READY!\n');
                console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
                console.log('━'.repeat(80));

                // Display QR in terminal with large size
                qrcode.generate(qr, { small: false }, (qrString) => {
                    console.log(qrString);
                });

                // Also save to file
                try {
                    await QRCode.toFile('./qr-whatsapp.png', qr, {
                        width: 300,
                        margin: 2
                    });
                    console.log('\n💾 QR code saved as: qr-whatsapp.png');
                    console.log('📁 Open this file if you can\'t see the QR above');
                } catch (err) {
                    console.log('⚠️  Could not save QR file:', err.message);
                }

                console.log('\n━'.repeat(80));
                console.log('📱 STEPS TO CONNECT:');
                console.log('1. Open WhatsApp on your phone');
                console.log('2. Go to Settings → Linked Devices');
                console.log('3. Tap "Link a Device"');
                console.log('4. Scan the QR code above');
                console.log('⏰ QR code will expire in 20 seconds!');
                console.log('━'.repeat(80));
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    console.log('🔄 Connection lost, reconnecting...');
                    setTimeout(startWhatsApp, 3000);
                } else {
                    console.log('🚪 Logged out from WhatsApp');
                }
            }

            if (connection === 'open') {
                console.log('\n✅ SUCCESS! CONNECTED TO WHATSAPP!');
                console.log('🤖 Your bot is now active and ready to receive messages!');
                console.log('📝 Send a message to test: "Hello"');
            }
        });

        socket.ev.on('creds.update', saveCreds);

        // Simple message handler for testing
        socket.ev.on('messages.upsert', async (messageUpdate) => {
            const message = messageUpdate.messages[0];

            if (!message.key.fromMe && message.message) {
                const messageText = message.message.conversation ||
                                 message.message.extendedTextMessage?.text || '';

                if (messageText) {
                    console.log(`📨 Received message: "${messageText}"`);

                    // Send a test reply
                    await socket.sendMessage(message.key.remoteJid, {
                        text: `✅ Bot received your message: "${messageText}"\n\n🎉 WhatsApp bot is working perfectly!`
                    });

                    console.log('📤 Sent reply back');
                }
            }
        });

        console.log('⏳ Waiting for QR code generation...');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n🔄 Retrying in 5 seconds...');
        setTimeout(startWhatsApp, 5000);
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down WhatsApp bot...');
    console.log('👋 Goodbye!');
    process.exit(0);
});

// Start the bot
startWhatsApp();