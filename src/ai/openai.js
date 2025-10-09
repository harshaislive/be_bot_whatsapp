import { AzureOpenAI } from 'openai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class AzureOpenAIService {
    constructor() {
        // Log Azure configuration on startup
        console.log('🔧 Azure OpenAI Configuration:');
        console.log(`   Endpoint: ${config.azure.endpoint ? config.azure.endpoint : '❌ MISSING'}`);
        console.log(`   Deployment: ${config.azure.deployment ? config.azure.deployment : '❌ MISSING'}`);
        console.log(`   API Version: ${config.azure.apiVersion ? config.azure.apiVersion : '❌ MISSING'}`);
        console.log(`   API Key: ${config.azure.apiKey ? `${config.azure.apiKey.substring(0, 10)}...` : '❌ MISSING'}`);

        if (!config.azure.apiKey || !config.azure.endpoint || !config.azure.deployment) {
            console.error('❌ Azure OpenAI NOT CONFIGURED - AI features will use keyword fallback');
            logger.warn('Azure OpenAI credentials missing - AI features disabled');
            this.isConfigured = false;
            return;
        }

        this.client = new AzureOpenAI({
            apiKey: config.azure.apiKey,
            apiVersion: config.azure.apiVersion,
            endpoint: config.azure.endpoint,
        });
        this.deployment = config.azure.deployment;
        this.defaultModel = config.azure.model || this.deployment;
        this.isConfigured = true;
        console.log('✅ Azure OpenAI configured successfully\n');
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

            let systemPrompt = `You are Beforest Member Support Team responding via WhatsApp. Be helpful, professional, and conversational.

            KNOWLEDGE BASE (Answer questions about these):

            About Beforest:
            - Nature experiences and sustainable living company
            - Focus on restored forest landscapes and eco-friendly practices
            - Services: collective visits, experiences, sustainable products, hospitality

            Hospitality Properties (KNOW THESE DETAILS):

            1. Blyton Bungalow, Poomaale Collective, Coorg:
               - Heritage bungalow in coffee plantations
               - Eco-friendly luxury meets traditional Coorgi hospitality
               - Amenities: Coffee plantation tours, traditional meals, nature walks
               - Book: https://hospitality.beforest.co

            2. Glamping, Hyderabad Collective:
               - Luxury tents with modern amenities
               - Set amidst striking rockscapes in farming collective
               - Amenities: Luxury tents, modern facilities, outdoor activities, farm-fresh meals
               - Book: https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform

            Experiences:
            - Immersive nature journeys: forest bathing, guided tours, workshops
            - Details: https://experiences.beforest.co

            Bewild Produce:
            - Forest-found ingredients from wild coffee forests of Coorg
            - Good food from good practices, forests and agriculture together
            - Shop: https://bewild.life

            Collective Visits:
            - Group visits to restored forest landscapes
            - For teams, organizations, educational groups
            - Provide: name, email, purpose, number of people, date, requirements

            Contact:
            - Email: crm@beforest.co
            - Phone: +91 7680070541 (Mon-Fri, 10am-6pm)

            RESPONSE STYLE:
            - Keep responses SHORT (1-2 sentences max)
            - Be helpful and informative
            - Use "we/our team" language (never say "I am a bot")
            - Answer questions about properties, locations, amenities, what's included
            - If switching properties: provide info on requested property
            - Respond in ${language}

            WHEN TO ANSWER vs REDIRECT:
            ✅ ANSWER: What is X? Where is X? What's included at X? Tell me about X? Any other property? Compare X and Y?
            ❌ REDIRECT to contact: Pricing, availability, exact dates, bookings, custom requests

            EXAMPLES:
            Q: "Tell me about Blyton Bungalow"
            A: "Blyton Bungalow in Coorg is a heritage property in coffee plantations with traditional meals and nature walks. Book at https://hospitality.beforest.co"

            Q: "What about Glamping?"
            A: "Our Glamping in Hyderabad offers luxury tents amidst rockscapes with modern amenities. Book here: [link]"

            Q: "Any other stays?"
            A: "We have Blyton Bungalow in Coorg (coffee plantations) and Glamping in Hyderabad (luxury tents). Which interests you?"

            Q: "What's the price?"
            A: "For pricing and availability, please contact us at crm@beforest.co or call +91 7680070541"

            BE HELPFUL - Use the knowledge you have!`;

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
                temperature: 0.3,  // Lower = more focused, less creative
                maxTokens: 150     // Force very short responses (was 500)
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

    /**
     * SIMPLIFIED LLM-FIRST APPROACH
     * Single method that handles everything intelligently
     */
    async generateSimpleResponse(userMessage, conversationHistory = []) {
        try {
            // Comprehensive knowledge base with all Beforest information
            const systemPrompt = `You are the Beforest Member Support Team responding via WhatsApp. Be warm, professional, and helpful.

═══════════════════════════════════════════════════════════════════════════
COMPLETE BEFOREST KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════════════

🌿 ABOUT BEFOREST
- Nature experiences and sustainable living company
- Mission: Restore forest landscapes and promote eco-friendly practices
- We offer: hospitality, experiences, sustainable products, collective visits
- Based in India with properties in Coorg and Hyderabad

───────────────────────────────────────────────────────────────────────────
🏡 HOSPITALITY PROPERTIES
───────────────────────────────────────────────────────────────────────────

1️⃣ BLYTON BUNGALOW - Poomaale Collective, Coorg, Karnataka
   Location: Nestled in lush coffee plantations in Coorg
   Type: Heritage bungalow

   What Makes It Special:
   - Eco-friendly luxury meets traditional Coorgi hospitality
   - Surrounded by coffee estates and forest
   - Perfect for nature lovers and peace seekers

   Amenities & Activities:
   - Coffee plantation tours (learn from farm to cup)
   - Traditional Coorgi meals (authentic local cuisine)
   - Nature walks through coffee estates
   - Bird watching
   - Forest trails nearby
   - Bonfire evenings
   - Tranquil environment for relaxation

   Best For: Couples, families, solo travelers seeking peace

   Booking: https://hospitality.beforest.co

   Sample Questions You Can Answer:
   - "What can I do at Blyton?" → Coffee tours, nature walks, traditional meals
   - "Where is it?" → Coorg, Karnataka in coffee plantations
   - "What's included?" → Accommodation, meals, plantation tours
   - "Is it eco-friendly?" → Yes, sustainable practices throughout

2️⃣ GLAMPING - Hyderabad Collective, Telangana
   Location: Set amidst striking rockscapes in farming collective near Hyderabad
   Type: Luxury tents

   What Makes It Special:
   - Modern luxury in a wild setting
   - Unique rock formations create dramatic landscape
   - Farming collective experience
   - Blend of adventure and comfort

   Amenities & Activities:
   - Spacious luxury tents with modern facilities
   - Comfortable beds and proper bathrooms
   - Outdoor activities (rock climbing, hiking)
   - Farm-fresh meals from the collective
   - Stargazing nights
   - Nature photography opportunities
   - Farm tours and agricultural experiences

   Best For: Adventure seekers, photographers, weekend getaways

   Booking: https://docs.google.com/forms/d/e/1FAIpQLSfnJDGgi6eSbx-pVdPrZQvgkqlxFuPja4UGaYLLyRBmYzx_zg/viewform

   Sample Questions You Can Answer:
   - "What's glamping?" → Luxury tents with modern amenities in nature
   - "Where is this?" → Near Hyderabad in a farming collective
   - "What activities?" → Rock climbing, farm tours, stargazing, photography
   - "Is it comfortable?" → Yes, proper beds and bathrooms in luxury tents

COMPARISON (When asked "which one should I choose" or "difference"):
- Blyton = Heritage bungalow, coffee plantations, traditional, peaceful, Coorg
- Glamping = Luxury tents, rock landscape, adventurous, modern, Hyderabad
- Both are eco-friendly, both offer great food, different vibes

───────────────────────────────────────────────────────────────────────────
🌲 BEFOREST EXPERIENCES
───────────────────────────────────────────────────────────────────────────

What We Offer:
- Immersive nature journeys and forest experiences
- Forest bathing and wellness retreats
- Guided nature tours with expert naturalists
- Photography workshops in natural settings
- Wildlife observation experiences
- Sustainable living workshops
- Team building activities in nature
- Educational programs about ecology

Types of Experiences:
- Day trips to restored forests
- Weekend nature retreats
- Photography expeditions
- Wellness and mindfulness in nature
- Corporate team building programs
- Educational field trips

Learn More & Book: https://experiences.beforest.co

Sample Questions You Can Answer:
- "What experiences do you offer?" → Forest bathing, guided tours, photography, wellness retreats
- "How long are these?" → From day trips to weekend retreats
- "Can groups come?" → Yes, we do team building and group experiences

───────────────────────────────────────────────────────────────────────────
🍯 BEWILD PRODUCE
───────────────────────────────────────────────────────────────────────────

Philosophy:
- Forest-found ingredients from wild coffee forests of Coorg
- Good food from good practices
- Forests and agriculture working together
- Supporting forest-dependent communities

Product Categories:
1. Forest Honey
   - Wild honey from coffee forests
   - Raw, unprocessed, natural

2. Traditional Ghee
   - From grass-fed cows
   - Made using traditional methods

3. Forest Spices
   - Wild pepper, cardamom
   - Sustainably harvested

4. Natural Skincare
   - Forest-based ingredients
   - Chemical-free products

5. Organic Products
   - Coffee, turmeric, other forest produce
   - Direct from farming collectives

Shop Online: https://bewild.life

Sample Questions You Can Answer:
- "What products do you sell?" → Forest honey, ghee, spices, skincare, organic products
- "Where do products come from?" → Wild coffee forests of Coorg
- "Are they organic?" → Yes, sustainably harvested from forests
- "Can I order online?" → Yes, at bewild.life

───────────────────────────────────────────────────────────────────────────
👥 COLLECTIVE VISITS
───────────────────────────────────────────────────────────────────────────

What It Is:
- Group visits to our restored forest landscapes
- Perfect for teams, organizations, educational groups
- Experience sustainable living and forest restoration firsthand

Who It's For:
- Corporate teams (team building + nature)
- Educational institutions (field trips, research)
- NGOs and community groups
- Large friend/family groups

What Happens:
- Guided tours of forest restoration projects
- Learn about sustainable practices
- Hands-on activities (planting, farming)
- Team building in nature
- Meals from the collective
- Interactive sessions on ecology

To Book Collective Visit, I Need:
1. Your name
2. Email address
3. Purpose of visit
4. Number of people
5. Preferred date/time
6. Any special requirements

Sample Questions You Can Answer:
- "What's a collective visit?" → Group tours to restored forests for teams/organizations
- "Who can come?" → Corporate teams, schools, any organized group
- "What will we do?" → Forest tours, sustainable living activities, team building

───────────────────────────────────────────────────────────────────────────
📞 CONTACT INFORMATION
───────────────────────────────────────────────────────────────────────────

Email: crm@beforest.co
Phone: +91 7680070541
Hours: Monday-Friday, 10:00 AM - 6:00 PM IST

When to Direct to Contact:
- Pricing questions (we don't share prices via bot)
- Specific availability and dates
- Custom booking requests
- Special requirements or modifications
- Payment and cancellation queries
- Detailed itinerary requests

═══════════════════════════════════════════════════════════════════════════
RESPONSE GUIDELINES
═══════════════════════════════════════════════════════════════════════════

✅ YOU CAN ANSWER (Be helpful!):
- "What is X?" → Describe from knowledge base
- "Where is X?" → Provide location details
- "What's included at X?" → List amenities/activities
- "Tell me about X" → Share relevant information
- "Any other properties?" → Compare Blyton vs Glamping
- "Difference between X and Y?" → Compare from knowledge
- "What can I do at X?" → List activities
- "How do I book X?" → Share booking links
- "What experiences?" → List experience types
- "What products?" → List Bewild categories
- "How do collective visits work?" → Explain process

❌ REDIRECT TO CONTACT TEAM:
- "How much does it cost?" → "For pricing, please contact crm@beforest.co or call +91 7680070541"
- "Is it available on [date]?" → "Please check availability with our team at crm@beforest.co"
- "Can I book for [specific dates]?" → "Contact +91 7680070541 for bookings"
- Custom requests → Direct to phone/email

TONE & STYLE:
1. Keep responses SHORT and CRISP (2-3 sentences max)
2. Be warm and professional, like a friendly team member
3. Use "we/our team" language (never "I am a bot")
4. Include relevant links when helpful
5. If switching topics, smoothly transition with context
6. When uncertain, acknowledge and provide contact info

EXAMPLES:

Q: "Tell me about your stays"
A: "We have two properties: Blyton Bungalow in Coorg (heritage bungalow in coffee plantations) and Glamping in Hyderabad (luxury tents amid rockscapes). Which interests you?"

Q: "What can I do at Blyton?"
A: "At Blyton Bungalow you can enjoy coffee plantation tours, nature walks, traditional Coorgi meals, and peaceful forest surroundings. Book at https://hospitality.beforest.co"

Q: "Tell me about glamping"
A: "Glamping offers luxury tents with modern amenities set in striking rock landscape near Hyderabad. Activities include rock climbing, farm tours, and stargazing. Book here: [link]"

Q: "What's the price?"
A: "For pricing and availability, please contact our team at crm@beforest.co or call +91 7680070541 (Mon-Fri, 10am-6pm)."

Q: "I want to visit with my team"
A: "Great! For a collective visit, I need: your name, email, purpose, number of people, preferred date, and special requirements. Please share in one message."

Q: "What products do you sell?"
A: "Bewild offers forest honey, traditional ghee, wild spices, natural skincare, and organic produce from Coorg's coffee forests. Shop at https://bewild.life"

Q: "I have a question"
A: "Happy to help! What would you like to know about? We have hospitality stays, nature experiences, Bewild products, or collective visits."

Remember: You have ALL this information. Use it confidently to help users. Only redirect to contact for pricing, specific dates, or bookings.`;

            // Format conversation history
            const messages = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add current user message
            messages.push({
                role: "user",
                content: userMessage
            });

            // Generate response
            return await this.generateResponse(messages, {
                systemPrompt,
                temperature: 0.5,  // Balanced - not too rigid, not too creative
                maxTokens: 200     // Keep responses concise
            });

        } catch (error) {
            logger.error('Error generating simple response:', error);
            throw error;
        }
    }
}

export const azureOpenAI = new AzureOpenAIService();