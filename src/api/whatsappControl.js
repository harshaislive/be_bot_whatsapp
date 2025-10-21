import { logger } from '../utils/logger.js';
import { redisService } from '../services/redisService.js';
import { supabaseService } from '../services/supabaseService.js';
import { config } from '../config/config.js';
import path from 'path';
import fs from 'fs';

class WhatsAppController {
    constructor() {
        this.bot = null;
        this.currentQRCode = null;
        this.qrCodeTimestamp = null;
    }

    setBotInstance(botInstance) {
        this.bot = botInstance;
    }

    // Store QR code when generated
    setQRCode(qrCode) {
        this.currentQRCode = qrCode;
        this.qrCodeTimestamp = Date.now();
        logger.info('QR code stored for web access');
    }

    // Clear QR code when connected
    clearQRCode() {
        this.currentQRCode = null;
        this.qrCodeTimestamp = null;
    }

    // Force disconnect WhatsApp for re-login
    async forceDisconnect(req, res) {
        try {
            logger.info('Force disconnect requested via API');
            console.log('🔄 Force disconnect requested via API...');

            if (!this.bot) {
                return res.status(400).json({
                    success: false,
                    message: 'Bot instance not available'
                });
            }

            // Step 1: Close current connection first (if exists and connected)
            try {
                if (this.bot.socket && this.bot.isConnected) {
                    await this.bot.socket.logout();
                    console.log('🚪 WhatsApp connection closed');
                } else {
                    console.log('ℹ️  Bot already disconnected, skipping logout');
                }
            } catch (error) {
                // Ignore logout errors (bot might already be disconnected)
                console.log('ℹ️  Logout skipped (bot already disconnected):', error.message);
            }

            // Step 2: Clear WhatsApp session from Supabase MULTIPLE TIMES to ensure it's gone
            await supabaseService.deleteWhatsAppSession();
            console.log('🗑️ WhatsApp session cleared from Supabase (attempt 1)');

            // Wait a bit and clear again to be absolutely sure
            await new Promise(resolve => setTimeout(resolve, 500));
            await supabaseService.deleteWhatsAppSession();
            console.log('🗑️ WhatsApp session cleared from Supabase (attempt 2)');

            // Step 3: Clear local auth files
            try {
                const authPath = './wa_session';
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Local auth files cleared');
                }
            } catch (error) {
                logger.warn('Could not clear local auth files:', error);
            }

            // Step 4: Restart bot after longer delay to ensure clean state
            setTimeout(() => {
                console.log('🔄 Restarting bot for fresh login with clean state...');
                this.bot.start();
            }, 3000);

            res.json({
                success: true,
                message: 'WhatsApp disconnected successfully. Bot will restart for fresh login.',
                timestamp: new Date().toISOString()
            });

            logger.info('WhatsApp force disconnect completed successfully');

        } catch (error) {
            logger.error('Error during force disconnect:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to disconnect WhatsApp',
                error: error.message
            });
        }
    }

    // Get WhatsApp connection status
    async getStatus(req, res) {
        try {
            let supabaseSession = null;
            let sessionStatus = { connected: false, hasSession: false };

            // Safely load session data
            try {
                supabaseSession = await supabaseService.loadWhatsAppSession();
            } catch (err) {
                logger.warn('Error loading Supabase session:', err);
            }

            // Safely get session status
            try {
                const result = await supabaseService.getWhatsAppSessionStatus();
                if (result && typeof result === 'object') {
                    sessionStatus = result;
                }
            } catch (err) {
                logger.warn('Error getting session status:', err);
            }

            const status = {
                whatsapp: {
                    connected: this.bot?.isConnected || false,
                    botNumber: this.bot?.socket?.user?.id || supabaseSession?.botNumber || null,
                    lastConnected: supabaseSession?.lastConnected || null
                },
                session: {
                    hasSession: sessionStatus?.hasSession || false,
                    storedInSupabase: sessionStatus?.connected || false
                },
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                status
            });

        } catch (error) {
            logger.error('Error getting WhatsApp status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get WhatsApp status',
                error: error.message
            });
        }
    }

    // Clear all sessions (WhatsApp + user sessions)
    async clearAllSessions(req, res) {
        try {
            logger.info('Clear all sessions requested via API');

            // Clear WhatsApp session from Supabase
            await supabaseService.deleteWhatsAppSession();

            // Clear all user sessions from Redis (still used for user sessions)
            const activeUsers = await redisService.getActiveUsers();
            for (const user of activeUsers) {
                await redisService.deleteUserSession(user);
            }

            console.log(`🗑️ Cleared WhatsApp session from Supabase and ${activeUsers.length} user sessions from Redis`);

            res.json({
                success: true,
                message: `Cleared WhatsApp session and ${activeUsers.length} user sessions`,
                clearedUsers: activeUsers.length,
                timestamp: new Date().toISOString()
            });

            logger.info('All sessions cleared successfully', { clearedUsers: activeUsers.length });

        } catch (error) {
            logger.error('Error clearing all sessions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear sessions',
                error: error.message
            });
        }
    }

    // Health check endpoint
    async healthCheck(req, res) {
        try {
            const health = {
                bot: {
                    running: !!this.bot,
                    connected: this.bot?.isConnected || false
                },
                redis: await redisService.ping(),
                timestamp: new Date().toISOString()
            };

            const overallHealth = health.bot.running && (health.redis || !redisService.getStatus().enabled);

            res.json({
                success: true,
                healthy: overallHealth,
                details: health
            });

        } catch (error) {
            logger.error('Error in health check:', error);
            res.status(500).json({
                success: false,
                healthy: false,
                error: error.message
            });
        }
    }

    // Get QR code image for web display
    async getQRCode(req, res) {
        try {
            const qrPath = path.join(process.cwd(), 'logs', 'whatsapp-qr.png');

            // Check if QR code file exists
            if (fs.existsSync(qrPath)) {
                const stats = fs.statSync(qrPath);
                const ageInSeconds = (Date.now() - stats.mtimeMs) / 1000;

                // QR codes expire after 20 seconds, but we'll serve files up to 30 seconds old
                if (ageInSeconds > 30) {
                    return res.status(404).json({
                        success: false,
                        message: 'QR code has expired. Please wait for a new one to be generated.'
                    });
                }

                // Set cache headers to prevent browser caching
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Content-Type', 'image/png');

                // Send the QR code image
                res.sendFile(qrPath);
            } else {
                res.status(404).json({
                    success: false,
                    message: 'QR code not available. Bot may be connected or waiting to generate QR code.'
                });
            }

        } catch (error) {
            logger.error('Error getting QR code:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve QR code',
                error: error.message
            });
        }
    }

    // Validate session manager password
    async validatePassword(req, res) {
        try {
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required'
                });
            }

            const isValid = password === config.security.sessionPassword;

            if (isValid) {
                logger.info('Session manager password validated successfully');
            } else {
                logger.warn('Invalid session manager password attempt', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }

            res.json({
                success: true,
                valid: isValid
            });

        } catch (error) {
            logger.error('Error validating password:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate password',
                error: error.message
            });
        }
    }
}

export const whatsappController = new WhatsAppController();