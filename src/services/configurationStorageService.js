'use strict';

const fs = require('fs');
const path = require('path');

function createConfigurationStorageService(deps) {
    const { vscode } = deps;

    async function saveConfiguration(extensionPath, codecovConfig) {
        const configPath = path.join(extensionPath, 'ConfigCoverage.json');

        let fullConfig = {};
        if (fs.existsSync(configPath)) {
            const existingContent = fs.readFileSync(configPath, 'utf8');
            fullConfig = JSON.parse(existingContent);
        }

        fullConfig.codecov = codecovConfig;
        fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 4));

        const globalConfig = vscode.workspace.getConfiguration('rpgleCoverage');

        if (codecovConfig.outputOptions) {
            await globalConfig.update('outputFormat', codecovConfig.outputOptions.format, vscode.ConfigurationTarget.Global);
        }

        if (codecovConfig.librarySettings) {
            await globalConfig.update(
                'useCodeForIBMiLibraryList',
                codecovConfig.librarySettings.useCodeForIBMiLibraryList,
                vscode.ConfigurationTarget.Global
            );
            await globalConfig.update(
                'validateQDEVTOOLS',
                codecovConfig.librarySettings.validateQDEVTOOLS,
                vscode.ConfigurationTarget.Global
            );
        }
    }

    async function loadConfiguration(extensionPath) {
        const configPath = path.join(extensionPath, 'ConfigCoverage.json');

        let codecovConfig = null;

        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const fullConfig = JSON.parse(content);
            codecovConfig = fullConfig.codecov;
        }

        const globalConfig = vscode.workspace.getConfiguration('rpgleCoverage');

        return {
            ...codecovConfig,
            outputOptions: {
                format: codecovConfig?.outputOptions?.format || globalConfig.get('outputFormat')
            },
            librarySettings: {
                useCodeForIBMiLibraryList:
                    codecovConfig?.librarySettings?.useCodeForIBMiLibraryList ?? globalConfig.get('useCodeForIBMiLibraryList'),
                validateQDEVTOOLS:
                    codecovConfig?.librarySettings?.validateQDEVTOOLS ?? globalConfig.get('validateQDEVTOOLS')
            }
        };
    }

    function validateConfiguration(extensionPath) {
        const configPath = path.join(extensionPath, 'ConfigCoverage.json');

        if (!fs.existsSync(configPath)) {
            throw new Error('Configuration file not found');
        }

        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);

        if (!config.codecov) {
            throw new Error('Codecov section not found in configuration');
        }

        const codecov = config.codecov;
        if (!codecov.programToExecute || !codecov.modules || codecov.modules.length === 0) {
            throw new Error('Missing required fields in configuration (programToExecute, modules)');
        }
    }

    return {
        saveConfiguration,
        loadConfiguration,
        validateConfiguration
    };
}

module.exports = { createConfigurationStorageService };
