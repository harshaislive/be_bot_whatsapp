import { logger } from './logger.js';

class UserProfileManager {
    constructor() {
        this.profiles = new Map();
        this.interactions = new Map();
    }

    async createProfile(phone, initialData = {}) {
        try {
            const profile = {
                phone,
                createdAt: new Date(),
                lastActive: new Date(),
                preferences: {
                    language: 'en',
                    timezone: 'UTC',
                    communicationStyle: 'professional',
                    ...initialData.preferences
                },
                history: {
                    totalMessages: 0,
                    totalSessions: 0,
                    averageSessionLength: 0,
                    commonTopics: [],
                    satisfactionRating: null
                },
                personalInfo: {
                    name: initialData.name || null,
                    email: initialData.email || null,
                    company: initialData.company || null,
                    role: initialData.role || null
                },
                engagement: {
                    level: 'new', // new, engaged, loyal, vip
                    score: 0,
                    lastInteractionType: null,
                    preferredContactTime: null
                },
                support: {
                    ticketHistory: [],
                    escalationCount: 0,
                    resolutionRate: 1.0,
                    satisfactionHistory: []
                }
            };

            this.profiles.set(phone, profile);
            logger.info('User profile created', { phone, profileData: profile });
            return profile;
        } catch (error) {
            logger.error('Error creating user profile:', error);
            throw error;
        }
    }

    async getProfile(phone) {
        try {
            if (!this.profiles.has(phone)) {
                return await this.createProfile(phone);
            }
            return this.profiles.get(phone);
        } catch (error) {
            logger.error('Error getting user profile:', error);
            // Return a minimal valid profile instead of null
            return {
                phone,
                createdAt: new Date(),
                lastActive: new Date(),
                preferences: { language: 'en' },
                history: { totalMessages: 0 },
                personalInfo: { name: null, email: null },
                engagement: { level: 'new', score: 0 },
                support: { ticketHistory: [], escalationCount: 0 }
            };
        }
    }

    async updateProfile(phone, updateData) {
        try {
            const profile = await this.getProfile(phone);
            if (!profile) return null;

            // Deep merge update data
            for (const [key, value] of Object.entries(updateData)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    profile[key] = { ...profile[key], ...value };
                } else {
                    profile[key] = value;
                }
            }

            profile.lastActive = new Date();
            this.profiles.set(phone, profile);

            logger.info('User profile updated', { phone, updateData });
            return profile;
        } catch (error) {
            logger.error('Error updating user profile:', error);
            return null;
        }
    }

    async recordInteraction(phone, interactionData) {
        try {
            const profile = await this.getProfile(phone);
            if (!profile) return;

            // Update interaction history
            profile.history.totalMessages++;
            profile.lastActive = new Date();

            // Track interaction details
            const interaction = {
                timestamp: new Date(),
                type: interactionData.type || 'message',
                topic: interactionData.topic || 'general',
                satisfaction: interactionData.satisfaction || null,
                duration: interactionData.duration || null,
                aiUsed: interactionData.aiUsed || false,
                escalated: interactionData.escalated || false
            };

            // Store recent interactions
            if (!this.interactions.has(phone)) {
                this.interactions.set(phone, []);
            }
            const userInteractions = this.interactions.get(phone);
            userInteractions.push(interaction);

            // Keep only last 50 interactions
            if (userInteractions.length > 50) {
                userInteractions.shift();
            }

            // Update engagement score
            this.updateEngagementScore(phone, interaction);

            // Update common topics
            this.updateCommonTopics(phone, interaction.topic);

            this.profiles.set(phone, profile);

            logger.userInteraction(phone, interaction.type, {
                topic: interaction.topic,
                engagementLevel: profile.engagement.level
            });

        } catch (error) {
            logger.error('Error recording interaction:', error);
        }
    }

    updateEngagementScore(phone, interaction) {
        try {
            const profile = this.profiles.get(phone);
            if (!profile) return;

            let scoreChange = 0;

            // Score based on interaction type
            switch (interaction.type) {
                case 'message': scoreChange += 1; break;
                case 'ai_interaction': scoreChange += 2; break;
                case 'escalation': scoreChange -= 1; break;
                case 'satisfaction_positive': scoreChange += 5; break;
                case 'satisfaction_negative': scoreChange -= 3; break;
                default: scoreChange += 1;
            }

            // Bonus for quick responses
            if (interaction.duration && interaction.duration < 30000) { // < 30 seconds
                scoreChange += 1;
            }

            profile.engagement.score += scoreChange;

            // Update engagement level
            if (profile.engagement.score >= 50) {
                profile.engagement.level = 'vip';
            } else if (profile.engagement.score >= 25) {
                profile.engagement.level = 'loyal';
            } else if (profile.engagement.score >= 10) {
                profile.engagement.level = 'engaged';
            } else {
                profile.engagement.level = 'new';
            }

            profile.engagement.lastInteractionType = interaction.type;

        } catch (error) {
            logger.error('Error updating engagement score:', error);
        }
    }

    updateCommonTopics(phone, topic) {
        try {
            const profile = this.profiles.get(phone);
            if (!profile || !topic) return;

            const topics = profile.history.commonTopics;
            const existingTopic = topics.find(t => t.name === topic);

            if (existingTopic) {
                existingTopic.count++;
            } else {
                topics.push({ name: topic, count: 1 });
            }

            // Sort by count and keep top 10
            topics.sort((a, b) => b.count - a.count);
            profile.history.commonTopics = topics.slice(0, 10);

        } catch (error) {
            logger.error('Error updating common topics:', error);
        }
    }

    async getPersonalizedGreeting(phone) {
        try {
            const profile = await this.getProfile(phone);
            if (!profile) return 'Hello! How can I help you today?';

            const name = profile.personalInfo.name || 'there';
            const level = profile.engagement.level;

            let greeting = `Hello ${name}! `;

            switch (level) {
                case 'vip':
                    greeting += '⭐ It\'s always a pleasure to assist our VIP customers! How may I provide exceptional service today?';
                    break;
                case 'loyal':
                    greeting += '🌟 Thank you for being a loyal customer! What can I help you with?';
                    break;
                case 'engaged':
                    greeting += '👋 Great to see you again! How can I assist you?';
                    break;
                default:
                    greeting += 'Welcome! How can I help you today?';
            }

            // Add context from recent interactions
            const recentInteractions = this.interactions.get(phone) || [];
            const lastInteraction = recentInteractions[recentInteractions.length - 1];

            if (lastInteraction && Date.now() - lastInteraction.timestamp.getTime() < 24 * 60 * 60 * 1000) {
                greeting += ` I see we discussed ${lastInteraction.topic} recently.`;
            }

            return greeting;

        } catch (error) {
            logger.error('Error generating personalized greeting:', error);
            return 'Hello! How can I help you today?';
        }
    }

    async getPersonalizedSystemPrompt(phone) {
        try {
            const profile = await this.getProfile(phone);
            if (!profile) return null;

            const { personalInfo, preferences, engagement, history } = profile;

            let prompt = `You are an enterprise WhatsApp assistant. User details:
- Name: ${personalInfo.name || 'Customer'}
- Engagement Level: ${engagement.level}
- Communication Style: ${preferences.communicationStyle}
- Language: ${preferences.language}`;

            if (personalInfo.company) {
                prompt += `\n- Company: ${personalInfo.company}`;
            }

            if (personalInfo.role) {
                prompt += `\n- Role: ${personalInfo.role}`;
            }

            if (history.commonTopics.length > 0) {
                prompt += `\n- Common Topics: ${history.commonTopics.slice(0, 3).map(t => t.name).join(', ')}`;
            }

            prompt += `\n\nGuidelines:
- Match their ${preferences.communicationStyle} communication style
- Reference their ${engagement.level} status appropriately
- Be helpful and professional
- Use ${preferences.language} language`;

            if (engagement.level === 'vip') {
                prompt += '\n- Provide VIP-level exceptional service';
            }

            return prompt;

        } catch (error) {
            logger.error('Error generating personalized system prompt:', error);
            return null;
        }
    }

    async getUserInsights(phone) {
        try {
            const profile = await this.getProfile(phone);
            const interactions = this.interactions.get(phone) || [];

            if (!profile) return null;

            const recentInteractions = interactions.filter(
                i => Date.now() - i.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
            );

            return {
                profile: {
                    name: profile.personalInfo.name,
                    engagementLevel: profile.engagement.level,
                    totalMessages: profile.history.totalMessages,
                    memberSince: profile.createdAt
                },
                recentActivity: {
                    messagesLast7Days: recentInteractions.length,
                    averageResponseTime: this.calculateAverageResponseTime(recentInteractions),
                    preferredTopics: profile.history.commonTopics.slice(0, 3),
                    satisfactionTrend: this.calculateSatisfactionTrend(interactions)
                },
                preferences: profile.preferences,
                recommendations: this.generateRecommendations(profile, interactions)
            };

        } catch (error) {
            logger.error('Error getting user insights:', error);
            return null;
        }
    }

    calculateAverageResponseTime(interactions) {
        const withDuration = interactions.filter(i => i.duration);
        if (withDuration.length === 0) return null;

        const average = withDuration.reduce((sum, i) => sum + i.duration, 0) / withDuration.length;
        return Math.round(average / 1000); // Convert to seconds
    }

    calculateSatisfactionTrend(interactions) {
        const satisfactionInteractions = interactions
            .filter(i => i.satisfaction !== null)
            .slice(-10); // Last 10 satisfaction ratings

        if (satisfactionInteractions.length === 0) return null;

        const average = satisfactionInteractions.reduce((sum, i) => sum + i.satisfaction, 0) / satisfactionInteractions.length;
        return {
            average: Math.round(average * 10) / 10,
            trend: satisfactionInteractions.length > 1 ?
                satisfactionInteractions[satisfactionInteractions.length - 1].satisfaction - satisfactionInteractions[0].satisfaction : 0
        };
    }

    generateRecommendations(profile, interactions) {
        const recommendations = [];

        // Engagement recommendations
        if (profile.engagement.level === 'new') {
            recommendations.push('Consider onboarding sequence for new user');
        } else if (profile.engagement.level === 'vip') {
            recommendations.push('Offer premium support options');
        }

        // Topic recommendations
        const topics = profile.history.commonTopics;
        if (topics.length > 0) {
            recommendations.push(`Focus on ${topics[0].name} related assistance`);
        }

        // Communication recommendations
        if (profile.preferences.communicationStyle === 'casual') {
            recommendations.push('Use friendly, informal tone');
        } else if (profile.preferences.communicationStyle === 'formal') {
            recommendations.push('Maintain professional, structured responses');
        }

        return recommendations;
    }
}

export const userProfileManager = new UserProfileManager();