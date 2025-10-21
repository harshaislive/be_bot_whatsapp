import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Azure OpenAI Configuration
    azure: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION,
        model: process.env.AZURE_OPENAI_DEPLOYMENT
    },

    // Bot Configuration
    bot: {
        name: process.env.BOT_NAME || 'Enterprise WhatsApp Bot',
        phoneNumber: process.env.BOT_PHONE_NUMBER,
        webhookUrl: process.env.WEBHOOK_URL
    },

    // Database Configuration
    database: {
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-bot',
            dbName: process.env.DB_NAME || 'whatsapp_bot'
        }
    },

    // Security
    security: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        sessionPassword: process.env.SESSION_PASSWORD || 'beforest2025' // Default password
    },

    // Rate Limiting
    rateLimit: {
        windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // minutes to milliseconds
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log'
    },

    // Server
    server: {
        port: parseInt(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV || 'development'
    },

    // Analytics
    analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics'
    },

    // Features
    features: {
        sentimentAnalysis: true,
        autoEscalation: true,
        userProfiling: true,
        contextAwareness: true,
        multiLanguage: true
    },

    // Supabase Configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY
    },

    // Redis Configuration
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        enabled: !!process.env.REDIS_URL
    }
};

// Validate required configuration
const requiredConfig = [
    'azure.apiKey',
    'azure.endpoint',
    'azure.deployment',
    'azure.apiVersion'
];

for (const configPath of requiredConfig) {
    const value = configPath.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
        console.error(`Missing required configuration: ${configPath}`);
        process.exit(1);
    }
}