'use strict';

function createConfigurationPanelMessageHandler(deps) {
    const {
        vscode,
        outputChannel,
        extensionPath,
        configurationStorageService,
        closePanel,
        postMessage
    } = deps;

    async function handleMessage(message) {
        try {
            switch (message.command) {
                case 'save': {
                    await configurationStorageService.saveConfiguration(extensionPath, message.config);
                    outputChannel.appendLine('Configuracion guardada exitosamente (archivo local y configuraciones globales)');
                    postMessage({ command: 'configSaved' });
                    break;
                }
                case 'load': {
                    const combinedConfig = await configurationStorageService.loadConfiguration(extensionPath);
                    postMessage({
                        command: 'configLoaded',
                        config: combinedConfig
                    });
                    break;
                }
                case 'test': {
                    try {
                        configurationStorageService.validateConfiguration(extensionPath);
                        postMessage({
                            command: 'testResult',
                            success: true
                        });
                    } catch (error) {
                        outputChannel.appendLine(`Error probando configuracion: ${error.message}`);
                        postMessage({
                            command: 'testResult',
                            success: false,
                            error: error.message
                        });
                    }
                    break;
                }
                case 'openGlobalSettings': {
                    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:balrocj.rpgle-code-coverage');
                    break;
                }
                case 'close': {
                    if (typeof closePanel === 'function') {
                        closePanel();
                    }
                    break;
                }
                default:
                    break;
            }
        } catch (error) {
            outputChannel.appendLine(`Error en ConfigurationPanel: ${error.message}`);
            postMessage({
                command: 'configError',
                error: error.message
            });
        }
    }

    return { handleMessage };
}

module.exports = { createConfigurationPanelMessageHandler };
