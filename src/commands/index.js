'use strict';

const vscode = require('vscode');

/**
 * Registro centralizado de comandos de la extension.
 *
 * @param {import('vscode').ExtensionContext} context
 * @param {{
 *   runCoverage: Function,
 *   clearCoverage: Function,
 *   generateReport: Function,
 *   refreshView: Function,
 *   openFile: Function,
 *   openConfig: Function,
 *   openExtensionSettings: Function,
 *   openReportsFolder: Function,
 *   refreshAvailableFiles: Function,
 *   processCoverageFile: Function,
 *   deleteCoverageFile: Function,
 *   selectLocalCoverageFile: Function,
 *   testCoverageProvider: Function,
 *   processResults: Function,
 *   showLastExecutionLog: Function
 * }} handlers
 */
function registerCommands(context, handlers) {
    const commands = [
        vscode.commands.registerCommand('rpgleCoverage.runCoverage', handlers.runCoverage),
        vscode.commands.registerCommand('rpgleCoverage.clearCoverage', handlers.clearCoverage),
        vscode.commands.registerCommand('rpgleCoverage.generateReport', handlers.generateReport),
        vscode.commands.registerCommand('rpgleCoverage.refreshView', handlers.refreshView),
        vscode.commands.registerCommand('rpgleCoverage.openFile', handlers.openFile),
        vscode.commands.registerCommand('rpgleCoverage.openConfig', handlers.openConfig),
        vscode.commands.registerCommand('rpgleCoverage.openExtensionSettings', handlers.openExtensionSettings),
        vscode.commands.registerCommand('rpgleCoverage.openReportsFolder', handlers.openReportsFolder),
        vscode.commands.registerCommand('rpgleCoverage.refreshAvailableFiles', handlers.refreshAvailableFiles),
        vscode.commands.registerCommand('rpgleCoverage.processCoverageFile', handlers.processCoverageFile),
        vscode.commands.registerCommand('rpgleCoverage.deleteCoverageFile', handlers.deleteCoverageFile),
        vscode.commands.registerCommand('rpgleCoverage.selectLocalCoverageFile', handlers.selectLocalCoverageFile),
        vscode.commands.registerCommand('rpgleCoverage.testCoverageProvider', handlers.testCoverageProvider),
        vscode.commands.registerCommand('rpgleCoverage.processResults', handlers.processResults),
        vscode.commands.registerCommand('rpgleCoverage.showLastExecutionLog', handlers.showLastExecutionLog)
    ];

    context.subscriptions.push(...commands);
    return commands.length;
}

module.exports = {
    registerCommands
};
