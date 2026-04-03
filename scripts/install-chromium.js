#!/usr/bin/env node

/**
 * Script de instalación automática de Chromium bundled para RPGLE Code Coverage
 * Se ejecuta automáticamente después de npm install
 * 
 * IMPORTANTE: Este script NO instala Chrome en .cache del usuario
 * Instala Chromium directamente en el directorio ./chromium/ del proyecto
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 RPGLE Code Coverage - Installing bundled Chromium components...');

async function installChromium() {
    try {
        const chromiumDir = path.join(__dirname, '..', 'chromium');
        
        // Verificar si ya existe
        if (fs.existsSync(chromiumDir)) {
            console.log('✅ Chromium already installed');
            return;
        }
        
        console.log('📦 Downloading Chromium browser...');
        console.log('⏳ This may take a few minutes depending on your internet connection...');
        
        // Descargar Chromium usando Puppeteer
        execSync('npx puppeteer browsers install chrome', {
            stdio: 'inherit',
            timeout: 300000 // 5 minutos timeout
        });
        
        // Encontrar la ubicación de Chromium descargado
        const os = require('os');
        const puppeteerCachePath = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
        
        if (!fs.existsSync(puppeteerCachePath)) {
            throw new Error('Chromium download failed - cache directory not found');
        }
        
        // Encontrar la versión descargada
        const versions = fs.readdirSync(puppeteerCachePath);
        if (versions.length === 0) {
            throw new Error('No Chromium version found in cache');
        }
        
        const latestVersion = versions[versions.length - 1]; // Usar la última versión
        const sourcePath = path.join(puppeteerCachePath, latestVersion, 'chrome-win64');
        
        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Chromium executable not found at: ${sourcePath}`);
        }
        
        // Crear directorio chromium en el proyecto
        fs.mkdirSync(chromiumDir, { recursive: true });
        
        // Copiar Chromium al directorio del proyecto
        console.log('📁 Copying Chromium to project directory...');
        copyRecursiveSync(sourcePath, path.join(chromiumDir, 'chrome-win64'));
        
        console.log('✅ Chromium installed successfully!');
        console.log(`📍 Location: ${path.join(chromiumDir, 'chrome-win64')}`);
        console.log('🎉 RPGLE Code Coverage is ready for PDF generation!');
        
    } catch (error) {
        console.error('❌ Chromium installation failed:', error.message);
        console.log('');
        console.log('📋 Manual installation steps:');
        console.log('1. Run: npx puppeteer browsers install chrome');
        console.log('2. Copy the downloaded Chrome to: ./chromium/chrome-win64/');
        console.log('3. Or use HTML reports only (PDF will be disabled)');
        
        // No fallar el proceso completo, solo advertir
        process.exit(0);
    }
}

// Función auxiliar para copiar directorios recursivamente
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    installChromium();
}

module.exports = { installChromium };