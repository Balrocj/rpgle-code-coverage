'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Crea comandos de gestion (configuracion, archivos disponibles, logs, reportes).
 */
function createManagementCommands(deps) {
    const {
        vscode,
        logger,
        getOutputChannel,
        getConfigPanel,
        getAvailableCoverageProvider,
        getCoverageExecutor
    } = deps;

    async function openConfig() {
        const outputChannel = getOutputChannel();
        const configPanel = getConfigPanel();

        try {
            outputChannel.appendLine('Abriendo panel de configuracion...');
            configPanel.createPanel();
        } catch (error) {
            outputChannel.appendLine(`Error abriendo panel de configuracion: ${error.message}`);
            outputChannel.appendLine(`Stack trace: ${error.stack}`);
            vscode.window.showErrorMessage(`Error opening configuration: ${error.message}`);
        }
    }

    async function openExtensionSettings() {
        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:balrocj.rpgle-code-coverage');
    }

    async function openReportsFolder() {
        const outputChannel = getOutputChannel();

        try {
            const extensionPath = vscode.extensions.getExtension('balrocj.rpgle-code-coverage')?.extensionPath ||
                                 path.join(__dirname, '..', '..');

            const reportsDir = path.join(extensionPath, 'coverage-reports');
            outputChannel.appendLine(`Abriendo carpeta de reportes: ${reportsDir}`);

            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
                outputChannel.appendLine('Carpeta de reportes creada');
            }

            await vscode.env.openExternal(vscode.Uri.file(reportsDir));
        } catch (error) {
            outputChannel.appendLine(`Error abriendo carpeta de reportes: ${error.message}`);
            outputChannel.appendLine(`Stack trace: ${error.stack}`);
            vscode.window.showErrorMessage(`Error opening reports folder: ${error.message}`);
        }
    }

    async function refreshAvailableFiles() {
        try {
            logger.debug('refreshAvailableFiles llamado');
            const availableCoverageProvider = getAvailableCoverageProvider();

            if (availableCoverageProvider) {
                availableCoverageProvider.refresh();
                vscode.window.showInformationMessage('Coverage file list updating');
            } else {
                logger.error('availableCoverageProvider no esta disponible');
                vscode.window.showErrorMessage('Error: File provider not available');
            }
        } catch (error) {
            logger.error('Error refrescando archivos:', error);
            vscode.window.showErrorMessage('Error refreshing files: ' + error.message);
        }
    }

    async function processCoverageFile(fileItem) {
        try {
            logger.debug('processCoverageFile llamado', fileItem);
            const availableCoverageProvider = getAvailableCoverageProvider();

            if (availableCoverageProvider) {
                await availableCoverageProvider.processCoverageFile(fileItem);
            } else {
                logger.error('availableCoverageProvider no esta disponible');
                vscode.window.showErrorMessage('Error: File provider not available');
            }
        } catch (error) {
            logger.error('Error procesando archivo:', error);
            vscode.window.showErrorMessage('Error processing file: ' + error.message);
        }
    }

    async function deleteCoverageFile(fileItem) {
        try {
            logger.debug('deleteCoverageFile llamado', fileItem);
            const availableCoverageProvider = getAvailableCoverageProvider();

            if (availableCoverageProvider) {
                await availableCoverageProvider.deleteCoverageFile(fileItem);
            } else {
                logger.error('availableCoverageProvider no esta disponible');
                vscode.window.showErrorMessage('Error: File provider not available');
            }
        } catch (error) {
            logger.error('Error eliminando archivo:', error);
            vscode.window.showErrorMessage('Error deleting file: ' + error.message);
        }
    }

    async function selectLocalCoverageFile() {
        try {
            logger.debug('selectLocalCoverageFile llamado');
            const coverageExecutor = getCoverageExecutor();

            if (!coverageExecutor || !coverageExecutor.connection) {
                vscode.window.showErrorMessage('Error: No active connection to IBM i. Please ensure Code for IBM i is connected.');
                return;
            }

            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    coverageFiles: ['cczip'],
                    allFiles: ['*']
                },
                openLabel: 'Select Coverage File'
            });

            if (!fileUri || fileUri.length === 0) {
                logger.debug('No file selected');
                return;
            }

            const selectedFile = fileUri[0];
            const fileName = path.basename(selectedFile.fsPath);

            logger.debug(`File selected: ${selectedFile.fsPath}`);
            vscode.window.showInformationMessage(`Processing local coverage file: ${fileName}...`);

            const coverageResults = await coverageExecutor.processLocalCoverageFile(selectedFile.fsPath);

            if (coverageResults) {
                vscode.window.showInformationMessage(`✅ Local file ${fileName} processed successfully`);
                vscode.commands.executeCommand('rpgleCoverage.processResults', coverageResults);
            } else {
                throw new Error('Coverage data could not be obtained from local file');
            }

        } catch (error) {
            logger.error('Error procesando archivo local:', error);
            vscode.window.showErrorMessage(`Error processing local file: ${error.message}`);
        }
    }

    async function testCoverageProvider() {
        try {
            logger.debug('TEST COVERAGE PROVIDER');
            const availableCoverageProvider = getAvailableCoverageProvider();
            const coverageExecutor = getCoverageExecutor();

            logger.debug('availableCoverageProvider:', !!availableCoverageProvider);
            logger.debug('coverageExecutor:', !!coverageExecutor);
            logger.debug('coverageExecutor.connection:', !!coverageExecutor?.connection);

            if (coverageExecutor && coverageExecutor.connection) {
                logger.debug('Probando listAvailableCoverageFiles...');
                const files = await coverageExecutor.listAvailableCoverageFiles();
                logger.debug('Archivos encontrados:', files);
                vscode.window.showInformationMessage(`TEST: Encontrados ${files.length} archivos .cczip`);
            } else {
                logger.error('No hay conexion disponible');
                vscode.window.showErrorMessage('ERROR: No IBM i connection available');
            }

            if (availableCoverageProvider) {
                logger.debug('Forzando refresh del provider...');
                availableCoverageProvider.refresh();
            }

        } catch (error) {
            logger.error('Error en test:', error);
            vscode.window.showErrorMessage('Test error: ' + error.message);
        }
    }

    async function showLastExecutionLog() {
        try {
            const coverageExecutor = getCoverageExecutor();

            if (!coverageExecutor) {
                vscode.window.showWarningMessage('Coverage executor not initialized');
                return;
            }

            const logData = coverageExecutor.getLastExecutionLog();

            if (!logData) {
                vscode.window.showInformationMessage('📋 No execution log available. Run coverage analysis first to see execution details.');
                return;
            }

            const timestamp = new Date(logData.timestamp).toLocaleString();
            let message = `Last Execution Log (${timestamp}):\n\n`;

            if (logData.cleanedLog && logData.cleanedLog.trim().length > 0) {
                message += logData.cleanedLog;
            } else {
                message += '✅ No errors detected in the last execution.';
            }

            try {
                const doc = await vscode.workspace.openTextDocument({
                    content: message,
                    language: 'log'
                });

                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    viewColumn: vscode.ViewColumn.Beside
                });

                await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
            } catch (docError) {
                logger.warn('Could not create document, falling back to modal:', docError);
                const maxModalLength = 2000;
                const truncatedMessage = message.length > maxModalLength
                    ? message.substring(0, maxModalLength) + '\n\n... (Message truncated. Check output channel for full log)'
                    : message;
                await vscode.window.showInformationMessage(truncatedMessage, { modal: true });
            }

        } catch (error) {
            logger.error('Error showing last execution log:', error);
            vscode.window.showErrorMessage(`Error displaying log: ${error.message}`);
        }
    }

    return {
        openConfig,
        openExtensionSettings,
        openReportsFolder,
        refreshAvailableFiles,
        processCoverageFile,
        deleteCoverageFile,
        selectLocalCoverageFile,
        testCoverageProvider,
        showLastExecutionLog
    };
}

module.exports = {
    createManagementCommands
};
