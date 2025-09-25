#!/usr/bin/env node

/**
 * Build script for Enterprise WhatsApp Bot
 * Prepares the application for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building Enterprise WhatsApp Bot...');

// Create necessary directories
const dirs = [
    'logs',
    'wa_session',
    'admin-dashboard/.next'
];

dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Build admin dashboard
console.log('📦 Building admin dashboard...');
try {
    const { execSync } = await import('child_process');

    // Change to admin dashboard directory and build
    process.chdir(path.join(__dirname, 'admin-dashboard'));
    execSync('npm ci --production=false', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });

    // Return to root directory
    process.chdir(__dirname);

    console.log('✅ Admin dashboard built successfully');
} catch (error) {
    console.warn('⚠️  Admin dashboard build failed, continuing with bot build');
    console.warn(error.message);

    // Return to root directory even if build fails
    process.chdir(__dirname);
}

// Check environment variables
console.log('🔍 Checking environment configuration...');

const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('📝 Make sure to set these in your deployment environment');
} else {
    console.log('✅ All required environment variables are configured');
}

// Create production start script
const startScript = `#!/usr/bin/env node

/**
 * Production start script
 * Starts the Enterprise WhatsApp Bot with proper error handling
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Enterprise WhatsApp Bot in production mode...');

const botPath = path.join(__dirname, 'src', 'app-enterprise.js');

const bot = spawn('node', [botPath], {
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production'
    }
});

bot.on('close', (code) => {
    console.log(\`Bot process exited with code \${code}\`);
    if (code !== 0) {
        console.error('Bot crashed, restarting in 5 seconds...');
        setTimeout(() => {
            process.exit(1);
        }, 5000);
    }
});

bot.on('error', (error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});
`;

fs.writeFileSync(path.join(__dirname, 'start-production.js'), startScript);
console.log('✅ Created production start script');

// Verify main files exist
const criticalFiles = [
    'src/app-enterprise.js',
    'src/config/config.js',
    'src/services/templateService.js',
    'package.json'
];

const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));

if (missingFiles.length > 0) {
    console.error('❌ Missing critical files:', missingFiles.join(', '));
    process.exit(1);
}

console.log('✅ Build completed successfully!');
console.log('📦 Ready for deployment');

// Output deployment instructions
console.log(`
🚀 Deployment Instructions:

1. Environment Variables Required:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - AZURE_OPENAI_API_KEY (optional)
   - REDIS_HOST (optional, defaults to localhost)
   - PORT (optional, defaults to 3000)

2. Start Command:
   npm start

3. Health Check:
   GET /api/status

4. Admin Dashboard:
   Available at /admin (if built successfully)
`);