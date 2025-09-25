import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class RateLimitManager {
    constructor() {
        // User message rate limiter (prevent spam)
        this.messageLimiter = new RateLimiterMemory({
            keyGen: (phone) => `msg_${phone}`,
            points: 10, // Number of messages
            duration: 60, // Per 60 seconds
            blockDuration: 300, // Block for 5 minutes if exceeded
        });

        // AI API rate limiter (protect AI service costs)
        this.aiLimiter = new RateLimiterMemory({
            keyGen: (phone) => `ai_${phone}`,
            points: 20, // AI requests
            duration: 3600, // Per hour
            blockDuration: 1800, // Block for 30 minutes
        });

        // Global rate limiter (protect entire system)
        this.globalLimiter = new RateLimiterMemory({
            keyGen: () => 'global',
            points: 1000, // Total requests
            duration: 60, // Per minute
            blockDuration: 60, // Block for 1 minute
        });
    }

    async checkMessageLimit(phone) {
        try {
            await this.messageLimiter.consume(phone);
            return { allowed: true };
        } catch (rejRes) {
            const msBeforeNext = rejRes.msBeforeNext || 0;
            logger.security('message_rate_limit_exceeded', {
                phone,
                msBeforeNext,
                totalHits: rejRes.totalHits
            });

            return {
                allowed: false,
                msBeforeNext,
                message: `⚠️ Too many messages. Please wait ${Math.ceil(msBeforeNext / 1000)} seconds.`
            };
        }
    }

    async checkAiLimit(phone) {
        try {
            await this.aiLimiter.consume(phone);
            return { allowed: true };
        } catch (rejRes) {
            const msBeforeNext = rejRes.msBeforeNext || 0;
            logger.security('ai_rate_limit_exceeded', {
                phone,
                msBeforeNext,
                totalHits: rejRes.totalHits
            });

            return {
                allowed: false,
                msBeforeNext,
                message: `🤖 AI service temporarily limited. Please wait ${Math.ceil(msBeforeNext / 60000)} minutes.`
            };
        }
    }

    async checkGlobalLimit() {
        try {
            await this.globalLimiter.consume('global');
            return { allowed: true };
        } catch (rejRes) {
            logger.security('global_rate_limit_exceeded', {
                msBeforeNext: rejRes.msBeforeNext,
                totalHits: rejRes.totalHits
            });

            return {
                allowed: false,
                message: '🔄 System temporarily busy. Please try again in a moment.'
            };
        }
    }

    async getRemainingPoints(phone) {
        try {
            const messageRes = await this.messageLimiter.get(phone);
            const aiRes = await this.aiLimiter.get(phone);

            return {
                messages: {
                    remaining: messageRes ? 10 - messageRes.totalHits : 10,
                    resetTime: messageRes ? new Date(Date.now() + messageRes.msBeforeNext) : null
                },
                ai: {
                    remaining: aiRes ? 20 - aiRes.totalHits : 20,
                    resetTime: aiRes ? new Date(Date.now() + aiRes.msBeforeNext) : null
                }
            };
        } catch (error) {
            logger.error('Error getting remaining points:', error);
            return null;
        }
    }

    // Method to be used as middleware in flows
    async middleware(ctx, next) {
        const phone = ctx.from;

        // Check global limit first
        const globalCheck = await this.checkGlobalLimit();
        if (!globalCheck.allowed) {
            return { error: globalCheck.message };
        }

        // Check message limit
        const messageCheck = await this.checkMessageLimit(phone);
        if (!messageCheck.allowed) {
            return { error: messageCheck.message };
        }

        // For AI flows, check AI limit too
        if (ctx.body && ctx.body.length > 10) { // Assume longer messages need AI
            const aiCheck = await this.checkAiLimit(phone);
            if (!aiCheck.allowed) {
                return { error: aiCheck.message };
            }
        }

        return { allowed: true };
    }
}

export const rateLimitManager = new RateLimitManager();