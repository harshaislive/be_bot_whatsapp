import { createClient } from 'redis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.initialized = false;
    }

    async initialize() {
        if (!config.redis.enabled) {
            logger.info('Redis not configured - using in-memory session storage');
            return;
        }

        try {
            // Create Redis client - URL contains all connection info
            this.client = createClient({
                url: config.redis.url
            });

            // Error handling
            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis Client Connected');
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                logger.warn('Redis Client Disconnected');
                this.isConnected = false;
            });

            // Connect to Redis
            await this.client.connect();
            this.initialized = true;

            logger.info('Redis service initialized successfully', {
                url: config.redis.url,
                db: config.redis.db
            });

        } catch (error) {
            logger.error('Failed to initialize Redis service:', error);
            this.client = null;
            this.isConnected = false;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.disconnect();
                logger.info('Redis client disconnected');
            } catch (error) {
                logger.error('Error disconnecting Redis client:', error);
            }
        }
    }

    // WhatsApp Session Management
    async saveWhatsAppSession(sessionData) {
        if (!this.isConnected) {
            logger.warn('Redis not connected - cannot save WhatsApp session');
            return false;
        }

        try {
            const sessionKey = 'whatsapp:session:auth';
            const serializedData = JSON.stringify(sessionData);

            await this.client.set(sessionKey, serializedData, {
                EX: 60 * 60 * 24 * 7 // Expire in 7 days
            });

            logger.info('WhatsApp session saved to Redis');
            return true;

        } catch (error) {
            logger.error('Error saving WhatsApp session to Redis:', error);
            return false;
        }
    }

    async loadWhatsAppSession() {
        if (!this.isConnected) {
            logger.warn('Redis not connected - cannot load WhatsApp session');
            return null;
        }

        try {
            const sessionKey = 'whatsapp:session:auth';
            const sessionData = await this.client.get(sessionKey);

            if (sessionData) {
                logger.info('WhatsApp session loaded from Redis');
                return JSON.parse(sessionData);
            }

            return null;

        } catch (error) {
            logger.error('Error loading WhatsApp session from Redis:', error);
            return null;
        }
    }

    async deleteWhatsAppSession() {
        if (!this.isConnected) {
            logger.warn('Redis not connected - cannot delete WhatsApp session');
            return false;
        }

        try {
            const sessionKey = 'whatsapp:session:auth';
            await this.client.del(sessionKey);

            logger.info('WhatsApp session deleted from Redis');
            return true;

        } catch (error) {
            logger.error('Error deleting WhatsApp session from Redis:', error);
            return false;
        }
    }

    // User Session Management
    async setUserSession(userPhone, sessionData) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');
            const sessionKey = `user:session:${cleanPhone}`;

            // Store the entire session as JSON string
            await this.client.set(sessionKey, JSON.stringify(sessionData));

            // Set expiration (24 hours of inactivity)
            await this.client.expire(sessionKey, 60 * 60 * 24);

            return true;

        } catch (error) {
            logger.error('Error saving user session to Redis:', error);
            return false;
        }
    }

    async getUserSession(userPhone) {
        if (!this.isConnected) {
            return null;
        }

        try {
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');
            const sessionKey = `user:session:${cleanPhone}`;

            const sessionData = await this.client.get(sessionKey);

            if (!sessionData) {
                return null;
            }

            // Parse the JSON session data
            return JSON.parse(sessionData);

        } catch (error) {
            logger.error('Error loading user session from Redis:', error);
            return null;
        }
    }

    async deleteUserSession(userPhone) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const cleanPhone = userPhone.replace('@s.whatsapp.net', '');
            const sessionKey = `user:session:${cleanPhone}`;

            await this.client.del(sessionKey);
            return true;

        } catch (error) {
            logger.error('Error deleting user session from Redis:', error);
            return false;
        }
    }

    // Cache Management
    async set(key, value, expireSeconds = 3600) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            await this.client.set(key, serializedValue, { EX: expireSeconds });
            return true;

        } catch (error) {
            logger.error('Error setting cache value in Redis:', error);
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected) {
            return null;
        }

        try {
            const value = await this.client.get(key);

            if (!value) return null;

            // Try to parse as JSON, fallback to string
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }

        } catch (error) {
            logger.error('Error getting cache value from Redis:', error);
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;

        } catch (error) {
            logger.error('Error deleting cache value from Redis:', error);
            return false;
        }
    }

    // Analytics & Statistics
    async incrementCounter(key, increment = 1) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const result = await this.client.incrBy(key, increment);
            return result;

        } catch (error) {
            logger.error('Error incrementing counter in Redis:', error);
            return 0;
        }
    }

    async getActiveUsers() {
        if (!this.isConnected) {
            return [];
        }

        try {
            const keys = await this.client.keys('user:session:*');
            return keys.map(key => key.replace('user:session:', ''));

        } catch (error) {
            logger.error('Error getting active users from Redis:', error);
            return [];
        }
    }

    // Health Check
    async ping() {
        if (!this.client) {
            return false;
        }

        try {
            const result = await this.client.ping();
            return result === 'PONG';

        } catch (error) {
            logger.error('Redis ping failed:', error);
            return false;
        }
    }

    // Status
    getStatus() {
        return {
            initialized: this.initialized,
            connected: this.isConnected,
            enabled: config.redis.enabled
        };
    }
}

export const redisService = new RedisService();