'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

function createPdfService(deps) {
    const { vscode, getOutputChannel, getExtensionPath } = deps;
    let pdfReady = false;

    function getBundledChromePath() {
        let extensionPath = null;

        if (typeof getExtensionPath === 'function') {
            extensionPath = getExtensionPath();
        }

        if (!extensionPath) {
            const extension = vscode.extensions.getExtension('balrocj.rpgle-code-coverage');
            extensionPath = extension ? extension.extensionPath : null;
        }

        if (!extensionPath) {
            // Fallback defensivo para escenarios no esperados
            extensionPath = path.join(__dirname, '..', '..');
        }

        return path.join(extensionPath, 'chromium', 'chrome-win64', 'chrome.exe');
    }

    async function initializePdfComponentsInBackground() {
        const outputChannel = getOutputChannel();
        try {
            outputChannel.appendLine('🔍 Initializing bundled PDF components...');

            const bundledChromePath = getBundledChromePath();
            outputChannel.appendLine(`📦 Using bundled Chrome: ${bundledChromePath}`);

            if (!fs.existsSync(bundledChromePath)) {
                throw new Error(`Bundled Chrome not found at: ${bundledChromePath}`);
            }

            const browser = await puppeteer.launch({
                executablePath: bundledChromePath,
                headless: true,
                timeout: 10000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            await browser.close();

            pdfReady = true;
            outputChannel.appendLine('✅ PDF components ready - Bundled Chrome working perfectly');
        } catch (error) {
            outputChannel.appendLine(`❌ Bundled PDF components failed: ${error.message}`);
            outputChannel.appendLine('📄 Falling back to HTML reports only');
            pdfReady = false;
        }
    }

    async function installChromiumInBackground() {
        const outputChannel = getOutputChannel();
        try {
            outputChannel.appendLine('🔍 Verifying bundled Chromium...');

            const bundledChromePath = getBundledChromePath();

            if (!fs.existsSync(bundledChromePath)) {
                throw new Error('Bundled Chrome not found');
            }

            const browser = await puppeteer.launch({
                executablePath: bundledChromePath,
                headless: true,
                timeout: 10000,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            await browser.close();

            outputChannel.appendLine('✅ Bundled Chromium verified successfully');
            vscode.window.showInformationMessage('📄 PDF report generation is ready');
            return true;
        } catch (error) {
            outputChannel.appendLine(`❌ Bundled Chromium verification failed: ${error.message}`);
            outputChannel.appendLine('📄 HTML reports will be used instead');
            return false;
        }
    }

    async function isPdfAvailable() {
        const outputChannel = getOutputChannel();
        if (pdfReady) {
            return true;
        }

        try {
            outputChannel.appendLine('🔍 Verificando Chromium bundled...');

            const bundledChromePath = getBundledChromePath();
            outputChannel.appendLine(`📦 Verificando Chromium bundled: ${bundledChromePath}`);

            if (!fs.existsSync(bundledChromePath)) {
                throw new Error('Bundled Chrome not found. Run: npm run dev-setup');
            }

            const browser = await puppeteer.launch({
                executablePath: bundledChromePath,
                headless: true,
                timeout: 10000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions'
                ]
            });
            await browser.close();

            pdfReady = true;
            outputChannel.appendLine('✅ Bundled Chromium verified and ready for PDF generation');
            return true;
        } catch (error) {
            outputChannel.appendLine(`❌ Bundled Chromium verification failed: ${error.message}`);
            outputChannel.appendLine('📄 PDF generation disabled - HTML reports only');
            return false;
        }
    }

    return {
        initializePdfComponentsInBackground,
        installChromiumInBackground,
        isPdfAvailable
    };
}

module.exports = { createPdfService };
