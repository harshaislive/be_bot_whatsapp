import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@builderbot/provider-baileys/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

console.log('🔧 Direct Baileys QR Test\n');

async function connectWhatsApp() {
    try {
        console.log('📱 Setting up WhatsApp connection...');

        // Use auth state
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

        // Create socket
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // We'll handle QR ourselves
            defaultQueryTimeoutMs: 60000,
        });

        // QR Code handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n🎉 QR CODE GENERATED!\n');
                console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
                console.log('═'.repeat(60));

                // Display QR in terminal
                qrcode.generate(qr, { small: true });

                // Save to file
                try {
                    await QRCode.toFile('whatsapp-qr.png', qr);
                    console.log('\n💾 QR code saved to: whatsapp-qr.png');
                } catch (error) {
                    console.log('⚠️  Could not save QR file');
                }

                console.log('═'.repeat(60));
                console.log('📱 Open WhatsApp → Settings → Linked Devices → Link Device');
                console.log('⏰ QR code expires in 20 seconds - scan quickly!');
                console.log('═'.repeat(60));
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);

                if (shouldReconnect) {
                    connectWhatsApp();
                }
            } else if (connection === 'open') {
                console.log('\n✅ CONNECTED TO WHATSAPP!');
                console.log('🤖 Connection successful! Bot is ready.');
            }
        });

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

        // Message handler for testing
        sock.ev.on('messages.upsert', (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && message.message?.conversation) {
                console.log('📨 Received:', message.message.conversation);

                // Auto-reply for testing
                sock.sendMessage(message.key.remoteJid, {
                    text: '✅ Bot is working! You successfully sent: ' + message.message.conversation
                });
            }
        });

    } catch (error) {
        console.error('❌ Error connecting to WhatsApp:', error);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});

connectWhatsApp();