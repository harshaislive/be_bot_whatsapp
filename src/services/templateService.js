import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class TemplateService {
    constructor() {
        if (!config.supabase.url || !config.supabase.anonKey) {
            logger.warn('Supabase configuration missing - template service disabled');
            this.client = null;
            return;
        }

        this.client = createClient(config.supabase.url, config.supabase.anonKey);
        this.templateCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;

        logger.info('Template service initialized with Supabase client');
    }

    async getTemplate(templateKey) {
        if (!this.client) {
            logger.warn('Template service not configured - returning null');
            return null;
        }

        try {
            // Check cache first
            if (this.shouldRefreshCache()) {
                await this.refreshCache();
            }

            const template = this.templateCache.get(templateKey);
            if (template) {
                logger.info(`Template '${templateKey}' retrieved from cache`);
                return template;
            }

            // If not in cache, fetch directly
            const { data, error } = await this.client
                .from('message_templates')
                .select('*')
                .eq('key', templateKey)
                .eq('is_active', true)
                .single();

            if (error) {
                logger.error(`Error fetching template '${templateKey}':`, error);
                return null;
            }

            if (data) {
                // Cache the result
                this.templateCache.set(templateKey, data);
                logger.info(`Template '${templateKey}' fetched and cached`);
                return data;
            }

            logger.warn(`Template '${templateKey}' not found`);
            return null;

        } catch (error) {
            logger.error(`Failed to get template '${templateKey}':`, error);
            return null;
        }
    }

    async getAllTemplates() {
        if (!this.client) {
            logger.warn('Template service not configured - returning empty array');
            return [];
        }

        try {
            const { data, error } = await this.client
                .from('message_templates')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true })
                .order('title', { ascending: true });

            if (error) {
                logger.error('Error fetching all templates:', error);
                return [];
            }

            return data || [];

        } catch (error) {
            logger.error('Failed to get all templates:', error);
            return [];
        }
    }

    async refreshCache() {
        if (!this.client) return;

        try {
            const templates = await this.getAllTemplates();

            // Clear and repopulate cache
            this.templateCache.clear();

            templates.forEach(template => {
                this.templateCache.set(template.key, template);
            });

            this.lastCacheUpdate = Date.now();
            logger.info(`Template cache refreshed with ${templates.length} templates`);

        } catch (error) {
            logger.error('Failed to refresh template cache:', error);
        }
    }

    shouldRefreshCache() {
        return Date.now() - this.lastCacheUpdate > this.cacheExpiry;
    }

    async renderTemplate(templateKey, variables = {}) {
        const template = await this.getTemplate(templateKey);

        if (!template) {
            logger.warn(`Template '${templateKey}' not found for rendering`);
            return null;
        }

        try {
            let content = template.content;

            // Replace variables in the format {{variableName}}
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                content = content.replace(regex, value || '');
            });

            logger.info(`Template '${templateKey}' rendered with variables:`, Object.keys(variables));
            return {
                ...template,
                renderedContent: content
            };

        } catch (error) {
            logger.error(`Failed to render template '${templateKey}':`, error);
            return null;
        }
    }

    async getTemplatesByCategory(category) {
        if (!this.client) {
            logger.warn('Template service not configured - returning empty array');
            return [];
        }

        try {
            const { data, error } = await this.client
                .from('message_templates')
                .select('*')
                .eq('category', category)
                .eq('is_active', true)
                .order('title', { ascending: true });

            if (error) {
                logger.error(`Error fetching templates for category '${category}':`, error);
                return [];
            }

            return data || [];

        } catch (error) {
            logger.error(`Failed to get templates for category '${category}':`, error);
            return [];
        }
    }

    // Helper method to extract variables from template content
    extractVariablesFromContent(content) {
        const regex = /{{(\w+)}}/g;
        const variables = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    // Initialize cache on startup
    async initialize() {
        if (this.client) {
            logger.info('Initializing template service cache...');
            await this.refreshCache();
        }
    }

    // Get fallback message when template is not found
    getFallbackMessage(templateKey) {
        const fallbackMessages = {
            welcome_message: `Hello! Welcome to Beforest 🌿

*How can we help you today?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us

Type a number or "menu" anytime.`,

            main_menu: `*How can we help?*

1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us

Type a number to continue.`,

            error_fallback: `I don't have that information readily available right now.

Please choose from our menu:
1. Collective Visit
2. Beforest Experiences
3. Bewild Produce
4. Beforest Hospitality
5. Contact Us

Or type "menu" to see options.`
        };

        return fallbackMessages[templateKey] || fallbackMessages.error_fallback;
    }
}

export const templateService = new TemplateService();