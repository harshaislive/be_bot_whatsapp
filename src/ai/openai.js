import { AzureOpenAI } from 'openai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class AzureOpenAIService {
    constructor() {
        this.client = new AzureOpenAI({
            apiKey: config.azure.apiKey,
            apiVersion: config.azure.apiVersion,
            endpoint: config.azure.endpoint,
        });
        this.deployment = config.azure.deployment;
        this.defaultModel = config.azure.model || this.deployment;
    }

    async generateResponse(messages, options = {}) {
        try {
            const {
                temperature = 0.7,
                maxTokens = 1000,
                systemPrompt = "You are a helpful WhatsApp assistant that provides excellent customer service.",
            } = options;

            const formattedMessages = [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...messages
            ];

            logger.info('Generating AI response', {
                messageCount: formattedMessages.length,
                temperature,
                maxTokens
            });

            const response = await this.client.chat.completions.create({
                messages: formattedMessages,
                model: this.defaultModel,
                temperature,
                max_tokens: maxTokens,
                top_p: 1.0,
            });

            const content = response.choices[0]?.message?.content;

            if (!content) {
                throw new Error('No content received from Azure OpenAI');
            }

            logger.info('AI response generated successfully', {
                responseLength: content.length,
                tokensUsed: response.usage?.total_tokens
            });

            return {
                content,
                usage: response.usage,
                model: response.model,
                finishReason: response.choices[0]?.finish_reason
            };
        } catch (error) {
            logger.error('Error generating AI response:', error);
            throw new Error(`AI service error: ${error.message}`);
        }
    }

    async generateContextualResponse(userMessage, conversationHistory = [], userProfile = {}) {
        try {
            const { name, preferences, language = 'en' } = userProfile;

            let systemPrompt = `You are part of Beforest Member Support Team responding via WhatsApp. Be helpful, professional, and conversational - not robotic.

            About Beforest:
            - beforest.co - Main website
            - bewild.life - Sustainable forest-found products
            - experiences.beforest.co - Curated nature experiences
            - Services: collective visits, nature experiences, eco-friendly stays, sustainable products

            ACCOMMODATION BOOKING:
            - Blyton Bungalow, Coorg → https://hospitality.beforest.co
            - Glamping, Hyderabad → https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform

            RESPONSE STYLE:
            - Keep responses SHORT and crisp (1-2 sentences max)
            - Be warm and professional, not robotic
            - Never say "I am a bot" or "I am an AI"
            - Use "we" or "our team" naturally
            - Respond in ${language} language

            WHEN YOU DON'T KNOW:
            - Don't make up answers
            - Acknowledge: "I don't have that information readily available"
            - Guide them to menu options OR contact us
            - Example: "I don't have specific pricing details. Please choose from our menu or contact us at crm@beforest.co"

            REDIRECT TO CONTACT (option 5) for:
            - Pricing, availability, dates
            - Product specifications
            - Custom requests
            - Anything outside core services
            - Format: "For that, please contact us at crm@beforest.co or call +91 7680070541"`;

            if (name) {
                systemPrompt += `\n- Address the user as ${name}`;
            }

            if (preferences) {
                systemPrompt += `\n- User preferences: ${JSON.stringify(preferences)}`;
            }

            const messages = [
                ...conversationHistory.slice(-5), // Keep last 5 messages for context
                {
                    role: "user",
                    content: userMessage
                }
            ];

            return await this.generateResponse(messages, {
                systemPrompt,
                temperature: 0.7,
                maxTokens: 500
            });
        } catch (error) {
            logger.error('Error generating contextual response:', error);
            throw error;
        }
    }

    async analyzeSentiment(text) {
        try {
            const messages = [{
                role: "user",
                content: `Analyze the sentiment of this message and respond with only one word: positive, negative, or neutral. Message: "${text}"`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "You are a sentiment analysis expert. Respond with only one word.",
                temperature: 0.1,
                maxTokens: 10
            });

            return response.content.toLowerCase().trim();
        } catch (error) {
            logger.error('Error analyzing sentiment:', error);
            return 'neutral';
        }
    }

    async generateSuggestions(context, count = 3) {
        try {
            const messages = [{
                role: "user",
                content: `Based on this conversation context, generate ${count} helpful response suggestions. Context: "${context}". Format as a simple numbered list.`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "Generate helpful response suggestions for customer service representatives.",
                temperature: 0.8,
                maxTokens: 200
            });

            return response.content.split('\n')
                .filter(line => line.trim())
                .slice(0, count);
        } catch (error) {
            logger.error('Error generating suggestions:', error);
            return [];
        }
    }

    async checkForEscalation(message, conversationHistory = []) {
        try {
            const context = conversationHistory.slice(-3).map(msg => msg.content).join('\n');
            const fullContext = `${context}\nLatest message: ${message}`;

            const messages = [{
                role: "user",
                content: `Analyze if this conversation requires human escalation. Consider: anger, complex technical issues, complaints, requests for manager, dissatisfaction. Respond with only "yes" or "no". Context: "${fullContext}"`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "You are an escalation detection expert. Respond with only 'yes' or 'no'.",
                temperature: 0.1,
                maxTokens: 5
            });

            return response.content.toLowerCase().trim() === 'yes';
        } catch (error) {
            logger.error('Error checking for escalation:', error);
            return false;
        }
    }

    async recognizeIntent(userMessage) {
        try {
            const messages = [{
                role: "user",
                content: `Analyze this user message and determine which Beforest service they're interested in.

User message: "${userMessage}"

Available options with keywords:
1. Collective Visit - group visit, team outing, corporate retreat, bulk booking, organization visit, company visit, collective, group booking, team building
2. Beforest Experiences - nature experience, forest activity, workshop, guided tour, experience, forest bathing, wildlife photography, nature walk
3. Bewild Produce - products, shopping, honey, ghee, spices, skincare, buy, purchase, bewild, produce, organic products
4. Beforest Hospitality - accommodation, stay, room, bungalow, glamping, booking, hotel, lodging, overnight, sleep, blyton, hospitality
5. Contact Beforest Team - query, question, support, help, contact, call, email, ask, inquire, information, general, doubt, clarification

Rules:
- Match exact keywords when possible
- "I have a query/question/need help" = option 5
- "accommodation/stay/booking" = option 4
- "group/team/collective" = option 1
- "products/buy/shopping" = option 3
- "experience/tour/activity" = option 2

Respond with ONLY the number (1-5) that best matches their intent. If unclear or greeting, respond with "0".`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "You are an intent recognition expert. Match keywords precisely. Respond with only a single number 0-5.",
                temperature: 0.1,
                maxTokens: 5
            });

            const intent = response.content.trim();
            logger.info('Intent recognized', { userMessage, intent });

            return intent;
        } catch (error) {
            logger.error('Error recognizing intent:', error);
            return '0'; // Default to no specific intent
        }
    }

    async isMenuRequest(userMessage) {
        try {
            const messages = [{
                role: "user",
                content: `Determine if this user message is requesting to see the main menu or go back to options.

User message: "${userMessage}"

Menu request indicators:
- "menu", "main menu", "back to menu"
- "options", "show options", "what are my options"
- "go back", "back", "return"
- "start over", "restart"
- "get me back to main menu"
- "help", "what can you do"

Respond with only "yes" if this is a menu request, "no" if it's not.`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "You are a menu request detection expert. Respond with only 'yes' or 'no'.",
                temperature: 0.1,
                maxTokens: 5
            });

            return response.content.toLowerCase().trim() === 'yes';
        } catch (error) {
            logger.error('Error detecting menu request:', error);
            return false;
        }
    }

    async generateIntentConfirmation(userMessage, recognizedOption) {
        try {
            const optionNames = {
                '1': 'Collective Visit',
                '2': 'Beforest Experiences',
                '3': 'Bewild Produce',
                '4': 'Beforest Hospitality',
                '5': 'Contact Beforest Team'
            };

            const messages = [{
                role: "user",
                content: `Generate a brief confirmation message for this intent recognition.

User said: "${userMessage}"
I recognized: ${optionNames[recognizedOption]}

Generate a short confirmation like: "I understand you're interested in [option]. Is that correct?"

Keep it under 15 words and friendly.`
            }];

            const response = await this.generateResponse(messages, {
                systemPrompt: "Generate brief, friendly confirmation messages.",
                temperature: 0.3,
                maxTokens: 30
            });

            return response.content;
        } catch (error) {
            logger.error('Error generating confirmation:', error);
            return `I think you're looking for information about this option. Is that correct?`;
        }
    }
}

export const azureOpenAI = new AzureOpenAIService();