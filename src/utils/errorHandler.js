import { logger } from './logger.js';
import { config } from '../config/config.js';

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.errorTypes = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    async handleError(error, context = {}) {
        try {
            const errorInfo = this.analyzeError(error);
            const errorKey = this.generateErrorKey(error, context);

            // Track error frequency
            this.trackError(errorKey, errorInfo);

            // Log error with context
            logger.error('Error handled', {
                error: errorInfo,
                context,
                frequency: this.errorCounts.get(errorKey) || 0
            });

            // Generate user-friendly response
            const userResponse = this.generateUserResponse(errorInfo, context);

            // Determine if escalation is needed
            const needsEscalation = this.shouldEscalate(errorKey, errorInfo);

            return {
                userResponse,
                needsEscalation,
                errorType: errorInfo.type,
                canRetry: errorInfo.retryable,
                errorCode: errorInfo.code
            };

        } catch (handlerError) {
            logger.error('Error in error handler:', handlerError);
            return {
                userResponse: '🛠️ I apologize for the technical difficulty. Please try again or contact support.',
                needsEscalation: true,
                errorType: 'handler_failure',
                canRetry: false
            };
        }
    }

    analyzeError(error) {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            type: 'unknown',
            severity: 'medium',
            retryable: false,
            code: null
        };

        // Analyze error type and properties
        if (error.name === 'TypeError') {
            errorInfo.type = 'type_error';
            errorInfo.severity = 'high';
            errorInfo.retryable = false;
        } else if (error.name === 'ReferenceError') {
            errorInfo.type = 'reference_error';
            errorInfo.severity = 'high';
            errorInfo.retryable = false;
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            errorInfo.type = 'network_error';
            errorInfo.severity = 'medium';
            errorInfo.retryable = true;
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
            errorInfo.type = 'rate_limit';
            errorInfo.severity = 'low';
            errorInfo.retryable = true;
        } else if (error.message.includes('API') || error.message.includes('OpenAI')) {
            errorInfo.type = 'api_error';
            errorInfo.severity = 'medium';
            errorInfo.retryable = true;
        } else if (error.message.includes('database') || error.message.includes('mongo')) {
            errorInfo.type = 'database_error';
            errorInfo.severity = 'high';
            errorInfo.retryable = true;
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
            errorInfo.type = 'auth_error';
            errorInfo.severity = 'high';
            errorInfo.retryable = false;
        }

        // Extract error codes if available
        if (error.code) {
            errorInfo.code = error.code;
        } else if (error.status) {
            errorInfo.code = error.status;
        }

        return errorInfo;
    }

    generateErrorKey(error, context) {
        const contextKey = context.flow || context.function || 'unknown';
        return `${error.name}_${contextKey}`;
    }

    trackError(errorKey, errorInfo) {
        // Count error occurrences
        const currentCount = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, currentCount + 1);

        // Track error types
        const typeCount = this.errorTypes.get(errorInfo.type) || 0;
        this.errorTypes.set(errorInfo.type, typeCount + 1);
    }

    shouldEscalate(errorKey, errorInfo) {
        // Escalate if error occurs frequently
        const errorCount = this.errorCounts.get(errorKey) || 0;
        if (errorCount >= 5) return true;

        // Escalate high severity errors
        if (errorInfo.severity === 'high') return true;

        // Escalate authentication errors
        if (errorInfo.type === 'auth_error') return true;

        return false;
    }

    generateUserResponse(errorInfo, context) {
        const responses = {
            network_error: [
                '🌐 I\'m experiencing connectivity issues. Let me try again in a moment.',
                '📡 Network connection seems unstable. Please wait while I reconnect.',
                '🔄 Having trouble reaching our servers. Retrying now...'
            ],
            rate_limit: [
                '⏱️ I\'m processing many requests right now. Please wait a moment.',
                '🚦 Service is temporarily busy. Your request will be processed shortly.',
                '⏰ High demand detected. Please give me a few seconds to catch up.'
            ],
            api_error: [
                '🤖 AI service is temporarily unavailable. Let me connect you with a human agent.',
                '⚙️ I\'m experiencing technical difficulties. Would you like to speak with someone?',
                '🛠️ AI system needs a moment to recover. How about we get you human help?'
            ],
            database_error: [
                '💾 Having trouble accessing your information. Let me resolve this.',
                '📊 Data service is temporarily down. I\'ll escalate this to our tech team.',
                '🗄️ Database connection issue detected. Connecting you to support.'
            ],
            auth_error: [
                '🔐 Authentication issue detected. Let me get you to the right team.',
                '🔑 Security verification needed. Transferring to our verification team.',
                '🛡️ Account access issue. Our security team will assist you.'
            ],
            type_error: [
                '⚡ Technical processing error occurred. Let me get this fixed.',
                '🔧 System error detected. Escalating to our technical team.',
                '💻 Processing issue encountered. Getting human assistance.'
            ],
            unknown: [
                '🛠️ I encountered an unexpected issue. Let me get you the right help.',
                '⚠️ Something unexpected happened. Connecting you to our support team.',
                '🔍 Unusual situation detected. Our experts will assist you better.'
            ]
        };

        const typeResponses = responses[errorInfo.type] || responses.unknown;
        const randomResponse = typeResponses[Math.floor(Math.random() * typeResponses.length)];

        // Add context-specific information
        let contextInfo = '';
        if (context.flow === 'ai_flow') {
            contextInfo = '\n\n💡 In the meantime, you can try:\n• Rephrasing your question\n• Using the menu (type "menu")\n• Requesting human help (type "agent")';
        } else if (context.retryable && errorInfo.retryable) {
            contextInfo = '\n\n🔄 I\'ll automatically retry this for you.';
        }

        return randomResponse + contextInfo;
    }

    async retryOperation(operation, context = {}, maxRetries = null) {
        const retries = maxRetries || this.maxRetries;
        let lastError;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                logger.info('Retry attempt', { attempt, maxRetries: retries, context });
                return await operation();
            } catch (error) {
                lastError = error;
                logger.warn(`Retry attempt ${attempt} failed`, { error: error.message, context });

                if (attempt < retries) {
                    await this.delay(this.retryDelay * attempt); // Exponential backoff
                }
            }
        }

        logger.error('All retry attempts failed', { attempts: retries, error: lastError.message, context });
        throw lastError;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getErrorStats() {
        const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const errorBreakdown = Object.fromEntries(this.errorTypes.entries());
        const topErrors = Array.from(this.errorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            totalErrors,
            errorBreakdown,
            topErrors: Object.fromEntries(topErrors),
            timestamp: new Date().toISOString()
        };
    }

    // Middleware for flows
    middleware() {
        return async (ctx, next) => {
            try {
                await next();
            } catch (error) {
                const context = {
                    phone: ctx.from,
                    flow: ctx.currentFlow || 'unknown',
                    message: ctx.body
                };

                const errorResponse = await this.handleError(error, context);

                // Send user response
                if (ctx.flowDynamic) {
                    await ctx.flowDynamic(errorResponse.userResponse);

                    // If escalation needed, trigger escalation flow
                    if (errorResponse.needsEscalation && ctx.gotoFlow) {
                        logger.info('Error escalation triggered', { context, errorType: errorResponse.errorType });
                        // Would trigger escalation flow here
                    }
                }

                // Don't re-throw the error to prevent bot crash
                logger.info('Error handled gracefully', { context, errorType: errorResponse.errorType });
            }
        };
    }

    // Cleanup old error tracking data
    cleanup() {
        // Reset counters if they get too large
        if (this.errorCounts.size > 1000) {
            logger.info('Cleaning up error tracking data');
            this.errorCounts.clear();
            this.errorTypes.clear();
        }
    }
}

export const errorHandler = new ErrorHandler();