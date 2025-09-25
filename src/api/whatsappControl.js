import { logger } from '../utils/logger.js';
import { redisService } from '../services/redisService.js';

class WhatsAppController {
    constructor() {
        this.bot = null;
    }

    setBotInstance(botInstance) {
        this.bot = botInstance;
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

            // Clear WhatsApp session from Redis
            await redisService.deleteWhatsAppSession();
            console.log('🗑️ WhatsApp session cleared from Redis');

            // Clear local auth files
            try {
                const fs = await import('fs');
                const authPath = './wa_session';
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Local auth files cleared');
                }
            } catch (error) {
                logger.warn('Could not clear local auth files:', error);
            }

            // Close current connection
            if (this.bot.socket) {
                await this.bot.socket.logout();
                console.log('🚪 WhatsApp connection closed');
            }

            // Restart bot for fresh login
            setTimeout(() => {
                console.log('🔄 Restarting bot for fresh login...');
                this.bot.start();
            }, 2000);

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
            const redisSession = await redisService.loadWhatsAppSession();
            const redisStatus = redisService.getStatus();

            const status = {
                whatsapp: {
                    connected: this.bot?.isConnected || false,
                    botNumber: this.bot?.socket?.user?.id || null,
                    lastConnected: redisSession?.timestamp || null
                },
                redis: {
                    connected: redisStatus.connected,
                    enabled: redisStatus.enabled,
                    hasSession: !!redisSession
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

            // Clear WhatsApp session
            await redisService.deleteWhatsAppSession();

            // Clear all user sessions
            const activeUsers = await redisService.getActiveUsers();
            for (const user of activeUsers) {
                await redisService.deleteUserSession(user);
            }

            console.log(`🗑️ Cleared WhatsApp session and ${activeUsers.length} user sessions`);

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
}

export const whatsappController = new WhatsAppController();