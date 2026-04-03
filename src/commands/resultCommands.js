'use strict';

function createResultCommands(deps) {
    const {
        vscode,
        logger,
        getCoverageData,
        getTreeDataProvider,
        getDecorationType,
        getOutputChannel
    } = deps;

    function applyCoverageDecorations(editor, coverage) {
        if (!editor || !coverage) {
            return;
        }

        const decorationType = getDecorationType();
        const outputChannel = getOutputChannel();

        try {
            editor.setDecorations(decorationType.covered, []);
            editor.setDecorations(decorationType.uncovered, []);

            const coveredRanges = [];
            const uncoveredRanges = [];

            Object.keys(coverage.lines).forEach(lineNumber => {
                const line = parseInt(lineNumber, 10) - 1;
                if (line >= 0 && line < editor.document.lineCount) {
                    const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);

                    if (coverage.lines[lineNumber] === true) {
                        coveredRanges.push(range);
                    } else {
                        uncoveredRanges.push(range);
                    }
                }
            });

            editor.setDecorations(decorationType.covered, coveredRanges);
            editor.setDecorations(decorationType.uncovered, uncoveredRanges);

            outputChannel.appendLine(`Aplicadas decoraciones: ${coveredRanges.length} líneas cubiertas, ${uncoveredRanges.length} líneas no cubiertas`);
        } catch (error) {
            outputChannel.appendLine(`Error aplicando decoraciones: ${error.message}`);
        }
    }

    async function processResults(results) {
        const coverageData = getCoverageData();
        const treeDataProvider = getTreeDataProvider();

        try {
            logger.debug('processResults', results);

            if (!results) {
                vscode.window.showErrorMessage('There are no coverage results to process');
                return;
            }

            coverageData.clear();

            if (Array.isArray(results)) {
                results.forEach(coverage => {
                    if (coverage && coverage.filePath) {
                        coverageData.set(coverage.filePath, coverage);
                    }
                });
            } else if (results.filePath) {
                coverageData.set(results.filePath, results);
            } else if (results instanceof Map) {
                results.forEach((coverage, filePath) => {
                    coverageData.set(filePath, coverage);
                });
            }

            logger.info(`Agregados ${coverageData.size} archivos a coverageData`);
            treeDataProvider.refresh();

            const fileCount = coverageData.size;
            vscode.window.showInformationMessage(`✅ Results processed: ${fileCount} coverage file(s) loaded`);

            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const activeFilePath = activeEditor.document.uri.toString();
                if (coverageData.has(activeFilePath)) {
                    applyCoverageDecorations(activeEditor, coverageData.get(activeFilePath));
                }
            }

            try {
                logger.info('Generando reporte PDF automáticamente');
                await vscode.commands.executeCommand('rpgleCoverage.generateReport');
                vscode.window.showInformationMessage('📄 PDF Report generated automatically');
            } catch (pdfError) {
                logger.error('Error generando reporte PDF:', pdfError);
                vscode.window.showWarningMessage(`⚠️ Results processed, but the PDF generation failed: ${pdfError.message}`);
            }
        } catch (error) {
            logger.error('Error procesando resultados de cobertura:', error);
            vscode.window.showErrorMessage(`Error processing results: ${error.message}`);
        }
    }

    return { processResults };
}

module.exports = { createResultCommands };
