'use strict';

function createDecorations(deps) {
    const {
        vscode,
        logger,
        normalizeUri,
        getOutputChannel,
        getCoverageData,
        getDecorationType
    } = deps;

    function calculateColoredLines(codeLines, coverage, inheritColoring) {
        if (!inheritColoring) {
            return {
                coveredLines: coverage.coveredLines,
                uncoveredLines: coverage.uncoveredLines
            };
        }

        const coveredLinesSet = new Set(coverage.coveredLines);
        const uncoveredLinesSet = new Set(coverage.uncoveredLines);
        const allExecutableLines = new Set([...coverage.coveredLines, ...coverage.uncoveredLines]);

        const resultCoveredLines = [];
        const resultUncoveredLines = [];
        let lastExecutableState = null;

        for (let i = 0; i < codeLines.length; i++) {
            const lineNum = i + 1;

            if (allExecutableLines.has(lineNum)) {
                if (coveredLinesSet.has(lineNum)) {
                    lastExecutableState = 'covered';
                    resultCoveredLines.push(lineNum);
                } else if (uncoveredLinesSet.has(lineNum)) {
                    lastExecutableState = 'uncovered';
                    resultUncoveredLines.push(lineNum);
                }
            } else {
                if (lastExecutableState === 'covered') {
                    resultCoveredLines.push(lineNum);
                } else if (lastExecutableState === 'uncovered') {
                    resultUncoveredLines.push(lineNum);
                }
            }

            const lineText = codeLines[i].trim().toLowerCase();
            if (lineText.includes('dcl-proc') || lineText.includes('dcl-pi') ||
                lineText.includes('end-proc') || lineText.includes('end-pi')) {
                // Reset en cambios de procedimiento (opcional)
                // lastExecutableState = null;
            }
        }

        return {
            coveredLines: resultCoveredLines,
            uncoveredLines: resultUncoveredLines
        };
    }

    function applyIntelligentColoring(activeEditor, coverage) {
        const codeLines = [];
        for (let i = 0; i < activeEditor.document.lineCount; i++) {
            codeLines.push(activeEditor.document.lineAt(i).text);
        }

        const config = vscode.workspace.getConfiguration('rpgleCoverage');
        const inheritColoring = config.get('inheritNonExecutableColoring', false);

        const coloredLines = calculateColoredLines(codeLines, coverage, inheritColoring);

        const coveredDecorations = coloredLines.coveredLines.map(lineNum => {
            const vscodeLineIndex = lineNum - 1;
            if (vscodeLineIndex >= 0 && vscodeLineIndex < activeEditor.document.lineCount) {
                const line = activeEditor.document.lineAt(vscodeLineIndex);
                return { range: new vscode.Range(vscodeLineIndex, 0, vscodeLineIndex, line.text.length) };
            }
            return null;
        }).filter(decoration => decoration !== null);

        const uncoveredDecorations = coloredLines.uncoveredLines.map(lineNum => {
            const vscodeLineIndex = lineNum - 1;
            if (vscodeLineIndex >= 0 && vscodeLineIndex < activeEditor.document.lineCount) {
                const line = activeEditor.document.lineAt(vscodeLineIndex);
                return { range: new vscode.Range(vscodeLineIndex, 0, vscodeLineIndex, line.text.length) };
            }
            return null;
        }).filter(decoration => decoration !== null);

        return {
            covered: coveredDecorations,
            uncovered: uncoveredDecorations
        };
    }

    function updateDecorations() {
        const outputChannel = getOutputChannel();
        const coverageData = getCoverageData();
        const decorationType = getDecorationType();

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        let filePath = activeEditor.document.uri.toString();

        outputChannel.appendLine(`🎨 updateDecorations: Buscando cobertura para: ${filePath}`);
        outputChannel.appendLine(`🎨 URI scheme: ${activeEditor.document.uri.scheme}`);
        outputChannel.appendLine(`🎨 Datos disponibles: ${Array.from(coverageData.keys()).join(', ')}`);

        if (activeEditor.document.uri.scheme === 'output' && filePath.includes('RPGLE Code Coverage')) {
            outputChannel.appendLine('🎯 Detectado documento temporal de RPGLE Code Coverage');
            const documentContent = activeEditor.document.getText();
            let foundSourceFile = null;

            for (const [key, coverage] of coverageData.entries()) {
                if (coverage.sourceCode && Array.isArray(coverage.sourceCode)) {
                    const coverageContent = coverage.sourceCode.join('\n');
                    if (documentContent.substring(0, 500) === coverageContent.substring(0, 500)) {
                        foundSourceFile = key;
                        outputChannel.appendLine(`🎯 Archivo fuente encontrado por contenido: ${key}`);
                        break;
                    }
                }
            }

            if (foundSourceFile) {
                filePath = foundSourceFile;
                outputChannel.appendLine(`🔄 Usando filePath corregido: ${filePath}`);
            }
        }

        const normalizedFilePath = normalizeUri(filePath);
        outputChannel.appendLine(`🎨 URI normalizada: ${normalizedFilePath}`);

        let coverage = coverageData.get(normalizedFilePath);

        if (!coverage) {
            coverage = coverageData.get(filePath);
        }

        if (!coverage) {
            try {
                const decodedFilePath = decodeURIComponent(filePath);
                outputChannel.appendLine(`🎨 Intentando con URI decodificada: ${decodedFilePath}`);
                coverage = coverageData.get(decodedFilePath);

                if (!coverage) {
                    for (const [key, value] of coverageData.entries()) {
                        try {
                            const encodedKey = encodeURI(key);
                            if (encodedKey === filePath) {
                                coverage = value;
                                outputChannel.appendLine(`🔄 Cobertura encontrada con clave codificada: ${key} -> ${filePath}`);
                                break;
                            }
                        } catch (encodeError) {
                            // Ignorar errores de codificación
                        }
                    }
                }
            } catch (decodeError) {
                outputChannel.appendLine(`⚠️ Error decodificando URI: ${decodeError.message}`);
            }
        }

        if (!coverage) {
            const lowerFilePath = filePath.toLowerCase();
            for (const [key, value] of coverageData.entries()) {
                if (key.toLowerCase() === lowerFilePath) {
                    coverage = value;
                    outputChannel.appendLine(`🔄 Cobertura encontrada con case-insensitive: ${key} -> ${filePath}`);
                    break;
                }
            }
        }

        if (!coverage) {
            outputChannel.appendLine(`❌ No se encontró cobertura para: ${filePath}`);
            const availableKeys = Array.from(coverageData.keys());
            if (availableKeys.length > 0) {
                outputChannel.appendLine('🔍 Claves disponibles:');
                availableKeys.forEach(key => outputChannel.appendLine(`  - ${key}`));
            }
            return;
        }

        outputChannel.appendLine(`✅ Cobertura encontrada: ${coverage.coveredLines.length} líneas cubiertas, ${coverage.uncoveredLines.length} líneas no cubiertas`);

        const config = vscode.workspace.getConfiguration('rpgleCoverage');
        const inheritColoring = config.get('inheritNonExecutableColoring', false);

        let coveredDecorations = [];
        let uncoveredDecorations = [];

        if (inheritColoring) {
            const { covered, uncovered } = applyIntelligentColoring(activeEditor, coverage);
            coveredDecorations = covered;
            uncoveredDecorations = uncovered;
            logger.debug(`Coloración inteligente aplicada: ${coveredDecorations.length} verdes, ${uncoveredDecorations.length} rojas`);
        } else {
            coveredDecorations = coverage.coveredLines.map(lineNum => {
                const vscodeLineIndex = lineNum - 1;
                if (vscodeLineIndex >= 0 && vscodeLineIndex < activeEditor.document.lineCount) {
                    const line = activeEditor.document.lineAt(vscodeLineIndex);
                    return { range: new vscode.Range(vscodeLineIndex, 0, vscodeLineIndex, line.text.length) };
                }
                return null;
            }).filter(decoration => decoration !== null);

            uncoveredDecorations = coverage.uncoveredLines.map(lineNum => {
                const vscodeLineIndex = lineNum - 1;
                if (vscodeLineIndex >= 0 && vscodeLineIndex < activeEditor.document.lineCount) {
                    const line = activeEditor.document.lineAt(vscodeLineIndex);
                    return { range: new vscode.Range(vscodeLineIndex, 0, vscodeLineIndex, line.text.length) };
                }
                return null;
            }).filter(decoration => decoration !== null);

            logger.debug(`Coloración tradicional aplicada: ${coveredDecorations.length} verdes, ${uncoveredDecorations.length} rojas`);
        }

        activeEditor.setDecorations(decorationType.covered, coveredDecorations);
        activeEditor.setDecorations(decorationType.uncovered, uncoveredDecorations);
    }

    return { updateDecorations };
}

module.exports = { createDecorations };
