import winston from 'winston';
import { config } from '../config/config.js';

const createLogger = () => {
    const logFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    );

    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let metaStr = '';
            if (Object.keys(meta).length > 0) {
                metaStr = ` ${JSON.stringify(meta)}`;
            }
            return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
    );

    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: config.logging.level
        })
    ];

    // Add file transport if log file is specified
    if (config.logging.file) {
        transports.push(
            new winston.transports.File({
                filename: config.logging.file,
                format: logFormat,
                level: config.logging.level,
                maxsize: 10485760, // 10MB
                maxFiles: 5,
                tailable: true
            })
        );
    }

    return winston.createLogger({
        level: config.logging.level,
        format: logFormat,
        transports,
        exitOnError: false
    });
};

export const logger = createLogger();

// Add custom methods for specific use cases
logger.botActivity = (activity, metadata = {}) => {
    logger.info('Bot Activity', { activity, ...metadata });
};

logger.userInteraction = (userId, action, metadata = {}) => {
    logger.info('User Interaction', { userId, action, ...metadata });
};

logger.aiUsage = (endpoint, tokens, metadata = {}) => {
    logger.info('AI Usage', { endpoint, tokens, ...metadata });
};

logger.performance = (operation, duration, metadata = {}) => {
    logger.info('Performance', { operation, duration, ...metadata });
};

logger.security = (event, metadata = {}) => {
    logger.warn('Security Event', { event, ...metadata });
};