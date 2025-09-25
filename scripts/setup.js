#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Enterprise WhatsApp Bot Setup Wizard');
console.log('=====================================\n');

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function collectConfiguration() {
    console.log('📝 Let\'s configure your bot...\n');

    const config = {};

    // Azure OpenAI Configuration
    console.log('🤖 Azure OpenAI Configuration:');
    config.AZURE_OPENAI_API_KEY = await askQuestion('Azure OpenAI API Key: ');
    config.AZURE_OPENAI_ENDPOINT = await askQuestion('Azure OpenAI Endpoint (e.g., https://your-resource.cognitiveservices.azure.com/): ');
    config.AZURE_OPENAI_DEPLOYMENT = await askQuestion('Deployment Name (e.g., gpt-5-chat): ');
    config.AZURE_OPENAI_API_VERSION = await askQuestion('API Version [2024-12-01-preview]: ') || '2024-12-01-preview';

    console.log('\n💾 Database Configuration:');
    config.MONGODB_URI = await askQuestion('MongoDB URI [mongodb://localhost:27017/whatsapp-bot]: ') || 'mongodb://localhost:27017/whatsapp-bot';
    config.DB_NAME = await askQuestion('Database Name [whatsapp_bot]: ') || 'whatsapp_bot';

    console.log('\n🤖 Bot Configuration:');
    config.BOT_NAME = await askQuestion('Bot Name [Enterprise WhatsApp Bot]: ') || 'Enterprise WhatsApp Bot';
    config.BOT_PHONE_NUMBER = await askQuestion('Bot Phone Number (optional): ') || '';

    console.log('\n🔐 Security Configuration:');
    config.JWT_SECRET = await askQuestion('JWT Secret (leave empty to generate): ') || generateSecret();
    config.ENCRYPTION_KEY = await askQuestion('Encryption Key (leave empty to generate): ') || generateSecret(32);

    console.log('\n⚙️ Advanced Configuration:');
    config.LOG_LEVEL = await askQuestion('Log Level [info]: ') || 'info';
    config.NODE_ENV = await askQuestion('Environment [development]: ') || 'development';
    config.PORT = await askQuestion('Port [3000]: ') || '3000';

    const analyticsEnabled = await askQuestion('Enable Analytics? [y/N]: ');
    config.ANALYTICS_ENABLED = analyticsEnabled.toLowerCase() === 'y' || analyticsEnabled.toLowerCase() === 'yes' ? 'true' : 'false';

    return config;
}

function generateSecret(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateEnvFile(config) {
    const envContent = `# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=${config.AZURE_OPENAI_API_KEY}
AZURE_OPENAI_ENDPOINT=${config.AZURE_OPENAI_ENDPOINT}
AZURE_OPENAI_DEPLOYMENT=${config.AZURE_OPENAI_DEPLOYMENT}
AZURE_OPENAI_API_VERSION=${config.AZURE_OPENAI_API_VERSION}

# Bot Configuration
BOT_NAME=${config.BOT_NAME}
BOT_PHONE_NUMBER=${config.BOT_PHONE_NUMBER}
WEBHOOK_URL=https://your-domain.com/webhook

# Database Configuration
MONGODB_URI=${config.MONGODB_URI}
DB_NAME=${config.DB_NAME}

# Security
JWT_SECRET=${config.JWT_SECRET}
ENCRYPTION_KEY=${config.ENCRYPTION_KEY}

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=${config.LOG_LEVEL}
LOG_FILE=logs/app.log

# Environment
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}

# Analytics
ANALYTICS_ENABLED=${config.ANALYTICS_ENABLED}
METRICS_ENDPOINT=/metrics
`;

    const envPath = path.join(rootDir, '.env');
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
}

function createDirectoryStructure() {
    console.log('\n📁 Creating directory structure...');

    const directories = [
        'logs',
        'data',
        'uploads',
        'backup',
        'temp'
    ];

    directories.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ Created: ${dir}/`);
        }
    });
}

function createGitignore() {
    const gitignorePath = path.join(rootDir, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# Bot specific
data/
uploads/
backup/
temp/
bot_session/
*.session
wa-session-*
`;

        fs.writeFileSync(gitignorePath, gitignoreContent);
        console.log('✅ .gitignore created');
    }
}

function displayNextSteps() {
    console.log('\n🎉 Setup completed successfully!\n');

    console.log('📋 Next Steps:');
    console.log('1. Review your .env file configuration');
    console.log('2. Make sure MongoDB is running');
    console.log('3. Start the bot with: npm start');
    console.log('4. Or use development mode: npm run dev\n');

    console.log('📖 Useful Commands:');
    console.log('• npm start          - Start the bot in production mode');
    console.log('• npm run dev        - Start in development mode with auto-restart');
    console.log('• npm test           - Run tests');
    console.log('• npm run lint       - Check code quality\n');

    console.log('📚 Documentation:');
    console.log('• README.md          - Complete documentation');
    console.log('• plan.md            - Project architecture plan');
    console.log('• src/               - Source code with inline comments\n');

    console.log('🔧 Configuration Files:');
    console.log('• .env               - Environment variables');
    console.log('• package.json       - Dependencies and scripts');
    console.log('• src/config/        - Application configuration\n');

    console.log('Happy coding! 🚀');
}

async function main() {
    try {
        const config = await collectConfiguration();

        console.log('\n🔧 Setting up your bot...');

        generateEnvFile(config);
        createDirectoryStructure();
        createGitignore();

        displayNextSteps();

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n🛑 Setup interrupted by user');
    rl.close();
    process.exit(0);
});

// Run the setup
main();