import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

class AnalyticsManager {
    constructor() {
        this.metrics = {
            totalMessages: 0,
            totalUsers: new Set(),
            totalAiInteractions: 0,
            totalEscalations: 0,
            averageResponseTime: 0,
            errorCount: 0,
            sessionMetrics: new Map()
        };

        this.userSessions = new Map();
        this.responseTimeTracker = new Map();

        // Start periodic reporting if enabled
        if (config.analytics.enabled) {
            this.startPeriodicReporting();
        }
    }

    trackMessage(phone, message, type = 'user') {
        try {
            this.metrics.totalMessages++;
            this.metrics.totalUsers.add(phone);

            // Track session
            if (!this.userSessions.has(phone)) {
                this.userSessions.set(phone, {
                    startTime: new Date(),
                    messageCount: 0,
                    aiInteractions: 0,
                    escalated: false
                });
            }

            const session = this.userSessions.get(phone);
            session.messageCount++;
            session.lastActivity = new Date();

            if (type === 'ai') {
                session.aiInteractions++;
                this.metrics.totalAiInteractions++;
            }

            logger.info('Message tracked', {
                phone,
                type,
                sessionDuration: Date.now() - session.startTime.getTime(),
                messageCount: session.messageCount
            });

        } catch (error) {
            logger.error('Error tracking message:', error);
        }
    }

    trackResponseTime(phone, startTime) {
        try {
            const responseTime = Date.now() - startTime;

            // Update average response time
            const currentAvg = this.metrics.averageResponseTime;
            const totalResponses = this.metrics.totalAiInteractions;
            this.metrics.averageResponseTime =
                (currentAvg * (totalResponses - 1) + responseTime) / totalResponses;

            logger.performance('response_time', responseTime, { phone });

            return responseTime;
        } catch (error) {
            logger.error('Error tracking response time:', error);
        }
    }

    trackEscalation(phone, reason) {
        try {
            this.metrics.totalEscalations++;

            const session = this.userSessions.get(phone);
            if (session) {
                session.escalated = true;
                session.escalationReason = reason;
                session.escalationTime = new Date();
            }

            logger.botActivity('escalation_tracked', {
                phone,
                reason,
                sessionDuration: session ? Date.now() - session.startTime.getTime() : 0
            });

        } catch (error) {
            logger.error('Error tracking escalation:', error);
        }
    }

    trackError(phone, error, context) {
        try {
            this.metrics.errorCount++;

            logger.error('Error tracked', {
                phone,
                error: error.message,
                context,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            logger.error('Error tracking error:', err);
        }
    }

    getUserMetrics(phone) {
        try {
            const session = this.userSessions.get(phone);
            if (!session) return null;

            return {
                sessionDuration: Date.now() - session.startTime.getTime(),
                messageCount: session.messageCount,
                aiInteractions: session.aiInteractions,
                escalated: session.escalated,
                lastActivity: session.lastActivity
            };
        } catch (error) {
            logger.error('Error getting user metrics:', error);
            return null;
        }
    }

    getGlobalMetrics() {
        try {
            const activeSessions = Array.from(this.userSessions.values())
                .filter(session => Date.now() - session.lastActivity.getTime() < 30 * 60 * 1000); // Active in last 30 minutes

            return {
                totalMessages: this.metrics.totalMessages,
                totalUniqueUsers: this.metrics.totalUsers.size,
                totalAiInteractions: this.metrics.totalAiInteractions,
                totalEscalations: this.metrics.totalEscalations,
                escalationRate: this.metrics.totalEscalations / this.metrics.totalAiInteractions,
                averageResponseTime: Math.round(this.metrics.averageResponseTime),
                errorCount: this.metrics.errorCount,
                errorRate: this.metrics.errorCount / this.metrics.totalMessages,
                activeSessions: activeSessions.length,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting global metrics:', error);
            return {};
        }
    }

    exportMetrics() {
        try {
            const globalMetrics = this.getGlobalMetrics();
            const userSessions = Array.from(this.userSessions.entries()).map(([phone, session]) => ({
                phone: phone.slice(-4), // Only last 4 digits for privacy
                ...session,
                sessionDuration: Date.now() - session.startTime.getTime()
            }));

            return {
                global: globalMetrics,
                sessions: userSessions,
                exportTime: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error exporting metrics:', error);
            return null;
        }
    }

    startPeriodicReporting() {
        // Report metrics every 10 minutes
        setInterval(() => {
            const metrics = this.getGlobalMetrics();
            logger.info('Periodic Analytics Report', metrics);
        }, 10 * 60 * 1000);

        // Cleanup old sessions every hour
        setInterval(() => {
            this.cleanupOldSessions();
        }, 60 * 60 * 1000);
    }

    cleanupOldSessions() {
        try {
            const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
            let cleanedCount = 0;

            for (const [phone, session] of this.userSessions.entries()) {
                if (session.lastActivity.getTime() < cutoffTime) {
                    this.userSessions.delete(phone);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.info('Session cleanup completed', { cleanedSessions: cleanedCount });
            }
        } catch (error) {
            logger.error('Error cleaning up sessions:', error);
        }
    }

    // Middleware function for flows
    middleware(type = 'message') {
        return async (ctx, next) => {
            const startTime = Date.now();
            const phone = ctx.from;

            try {
                this.trackMessage(phone, ctx.body, type);
                await next();
                this.trackResponseTime(phone, startTime);
            } catch (error) {
                this.trackError(phone, error, type);
                throw error;
            }
        };
    }
}

export const analyticsManager = new AnalyticsManager();