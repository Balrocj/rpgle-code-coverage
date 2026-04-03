#!/usr/bin/env node

/**
 * Script de desarrollo - Setup completo del proyecto
 * Uso: npm run dev-setup
 */

console.log('🚀 RPGLE Code Coverage - Development Setup');
console.log('==========================================');

const { execSync } = require('child_process');
const path = require('path');

async function setupDevelopment() {
    try {
        console.log('📦 1. Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        
        console.log('🔧 2. Installing Chromium (this may take a few minutes)...');
        execSync('node scripts/install-chromium.js', { stdio: 'inherit' });
        
        console.log('⚙️ 3. Compiling extension...');
        execSync('npm run compile-debug', { stdio: 'inherit' });
        
        console.log('');
        console.log('✅ Development setup complete!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('• Press F5 in VS Code to run the extension');
        console.log('• Or run: npm run watch-debug for development');
        console.log('• To package: npm run package && npx vsce package');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('');
        console.log('🔧 Try manual setup:');
        console.log('1. npm install');
        console.log('2. npx puppeteer browsers install chrome');
        console.log('3. Copy Chrome to ./chromium/chrome-win64/');
        console.log('4. npm run compile-debug');
    }
}

setupDevelopment();