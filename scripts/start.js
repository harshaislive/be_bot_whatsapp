#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 Enterprise WhatsApp Bot Startup Script');
console.log('==========================================\n');

// Check Node.js version
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    console.log(`📋 Checking Node.js version: ${nodeVersion}`);

    if (majorVersion < 18) {
        console.error('❌ Node.js 18+ required. Please upgrade Node.js.');
        process.exit(1);
    }
    console.log('✅ Node.js version compatible\n');
}

// Check if .env file exists
function checkEnvironment() {
    const envPath = path.join(rootDir, '.env');
    const envExamplePath = path.join(rootDir, '.env.example');

    console.log('📋 Checking environment configuration...');

    if (!fs.existsSync(envPath)) {
        console.log('⚠️  .env file not found. Creating from .env.example...');

        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ .env file created from template');
            console.log('⚠️  Please edit .env file with your configuration before starting the bot');
            console.log('   Required: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, MONGODB_URI\n');
            return false;
        } else {
            console.error('❌ .env.example not found. Cannot create .env file.');
            process.exit(1);
        }
    }

    console.log('✅ Environment file found\n');
    return true;
}

// Validate required environment variables
function validateEnvironment() {
    console.log('📋 Validating required environment variables...');

    const requiredVars = [
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_DEPLOYMENT',
        'AZURE_OPENAI_API_VERSION'
    ];

    const missingVars = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nPlease update your .env file with the required values.');
        return false;
    }

    console.log('✅ All required environment variables present\n');
    return true;
}

// Check if dependencies are installed
function checkDependencies() {
    console.log('📋 Checking dependencies...');

    const packageJsonPath = path.join(rootDir, 'package.json');
    const nodeModulesPath = path.join(rootDir, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        console.log('⚠️  node_modules not found. Installing dependencies...');
        try {
            execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
            console.log('✅ Dependencies installed successfully\n');
        } catch (error) {
            console.error('❌ Failed to install dependencies:', error.message);
            process.exit(1);
        }
    } else {
        console.log('✅ Dependencies found\n');
    }
}

// Create required directories
function createDirectories() {
    console.log('📋 Creating required directories...');

    const dirs = [
        'logs',
        'data',
        'uploads'
    ];

    dirs.forEach(dir => {
        const dirPath = path.join(rootDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });

    console.log('✅ All directories ready\n');
}

// Display startup information
function displayStartupInfo() {
    console.log('🎯 Bot Configuration:');
    console.log(`   - Bot Name: ${process.env.BOT_NAME || 'Enterprise WhatsApp Bot'}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Port: ${process.env.PORT || 3000}`);
    console.log(`   - Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    console.log(`   - Analytics: ${process.env.ANALYTICS_ENABLED || 'true'}`);
    console.log('');
}

// Start the bot
function startBot() {
    console.log('🚀 Starting Enterprise WhatsApp Bot...\n');

    try {
        // Use spawn instead of execSync for better output handling
        const child = spawn('node', ['src/app-enterprise.js'], {
            cwd: rootDir,
            stdio: 'inherit'
        });

        child.on('error', (error) => {
            console.error('❌ Failed to start bot:', error.message);
            process.exit(1);
        });

        child.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ Bot exited with code ${code}`);
                process.exit(code);
            }
        });

    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
}

// Main startup sequence
async function main() {
    try {
        checkNodeVersion();

        const envExists = checkEnvironment();
        if (!envExists) {
            console.log('Please configure your .env file and run the script again.');
            process.exit(0);
        }

        // Load environment variables
        const dotenv = await import('dotenv');
        dotenv.config();

        const validEnv = validateEnvironment();
        if (!validEnv) {
            process.exit(1);
        }

        checkDependencies();
        createDirectories();
        displayStartupInfo();
        startBot();

    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n🛑 Startup interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Startup terminated');
    process.exit(0);
});

// Run the startup script
main();