'use strict';

function createStateCommands(deps) {
    const {
        vscode,
        logger,
        getCoverageData,
        getTreeDataProvider,
        getDecorationType,
        getCoverageExecutor,
        getDecorationsController
    } = deps;

    function clearCoverage() {
        const coverageData = getCoverageData();
        const treeDataProvider = getTreeDataProvider();
        const decorationType = getDecorationType();
        const coverageExecutor = getCoverageExecutor();

        coverageData.clear();
        treeDataProvider.refresh();

        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            activeEditor.setDecorations(decorationType.covered, []);
            activeEditor.setDecorations(decorationType.uncovered, []);
        }

        if (coverageExecutor) {
            coverageExecutor.lastExecutionLog = null;
            coverageExecutor.lastExecutionTimestamp = null;
            logger.info('Execution log cleared along with coverage data');
        }

        vscode.window.showInformationMessage('Coverage data and execution log cleared');
    }

    function refreshView() {
        const treeDataProvider = getTreeDataProvider();
        const decorationsController = getDecorationsController();

        treeDataProvider.refresh();
        if (decorationsController) {
            decorationsController.updateDecorations();
        }
    }

    return { clearCoverage, refreshView };
}

module.exports = { createStateCommands };
