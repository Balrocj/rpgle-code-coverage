'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

/**
 * Crea los comandos de generación de reportes de cobertura.
 * @param {Object} deps - Dependencias inyectadas
 * @param {Object} deps.vscode - API de VS Code
 * @param {Object} deps.logger - Logger de la extensión
 * @param {Function} deps.getOutputChannel - Getter del canal de salida
 * @param {Function} deps.getCoverageData - Getter del Map de datos de cobertura
 * @param {Function} deps.getCleanFileName - Utilidad de nombre de archivo limpio
 * @param {Function} deps.isPdfAvailable - Función que verifica si Chromium está disponible
 */
function createReportCommands(deps) {
    const { vscode, logger, getOutputChannel, getCoverageData, getCleanFileName, isPdfAvailable } = deps;

    async function readFileContent(filePath) {
        const outputChannel = getOutputChannel();
        try {
            if (filePath.startsWith('member:')) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.uri.toString() === filePath) {
                    return activeEditor.document.getText();
                } else {
                    outputChannel.appendLine(`Abriendo archivo para reporte: ${filePath}`);
                    const uri = vscode.Uri.parse(filePath);
                    const document = await vscode.workspace.openTextDocument(uri);
                    return document.getText();
                }
            } else {
                return fs.readFileSync(filePath, 'utf8');
            }
        } catch (error) {
            outputChannel.appendLine(`Error leyendo archivo ${filePath}: ${error.message}`);
            const fileName = getCleanFileName(filePath);
            return `// Error leyendo archivo: ${fileName}\n// ${error.message}`;
        }
    }

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

    async function generateReportHTML(filesToRender) {
        const outputChannel = getOutputChannel();
        const files = Array.isArray(filesToRender)
            ? filesToRender
            : Array.from(getCoverageData().values());
        const config = vscode.workspace.getConfiguration('rpgleCoverage');
        const inheritColoring = config.get('inheritNonExecutableColoring', false);
        const passThreshold = Number(config.get('thresholds.pass'));
        const warningThreshold = Number(config.get('thresholds.warning'));

        const getStatusColor = (coveragePercentage) => {
            if (coveragePercentage >= passThreshold) {
                return '#4CAF50';
            }

            if (coveragePercentage >= warningThreshold) {
                return '#FF9800';
            }

            return '#F44336';
        };

        const getSectionAnchor = (filePath, index) => {
            const safeFileName = getCleanFileName(filePath)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            return `coverage-${index + 1}-${safeFileName || 'component'}`;
        };

        let filesHTML = '';

        for (const [index, file] of files.entries()) {
            const fileName = getCleanFileName(file.filePath);
            const sectionAnchor = getSectionAnchor(file.filePath, index);
            const statusColor = getStatusColor(file.coveragePercentage);

            let codeLines;
            if (file.sourceCode && Array.isArray(file.sourceCode)) {
                outputChannel.appendLine(`Usando código fuente del .cczip para: ${fileName}`);
                codeLines = file.sourceCode;
            } else {
                outputChannel.appendLine(`Leyendo contenido para reporte: ${fileName}`);
                const content = await readFileContent(file.filePath);
                codeLines = content.split('\n');
            }

            const coloredLines = calculateColoredLines(codeLines, file, inheritColoring);

            let codeHTML = '<pre style="font-family: monospace; font-size: 13px; background: #222; color: #eee; border-radius: 8px; padding: 10px; overflow-x: auto;">';
            for (let i = 0; i < codeLines.length; i++) {
                let line = codeLines[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
                let style = '';
                const lineNumber = i + 1;

                if (coloredLines.coveredLines.includes(lineNumber)) {
                    style = 'background: #2e7d32; color: #fff;';
                } else if (coloredLines.uncoveredLines.includes(lineNumber)) {
                    style = 'background: #c62828; color: #fff;';
                } else {
                    style = 'color: #bbb;';
                }
                codeHTML += `<span style="display: block; ${style}; padding: 2px 4px; margin: 1px 0;">${String(lineNumber).padStart(4, ' ')}: ${line}</span>`;
            }
            codeHTML += '</pre>';

            filesHTML += `
        <section id="${sectionAnchor}" style="scroll-margin-top: 20px;">
        <div style="text-align: right; margin-top: 10px;">
            <a href="#summary-top" class="back-to-summary" title="Go back to summary">Back to summary ↑</a>
        </div>
        <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 5px;">
            📄 ${fileName.toUpperCase()}
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th>Total Lines</th>
                    <th>Executable Lines</th>
                    <th>Covered Lines</th>
                    <th>Uncovered Lines</th>
                    <th>% Coverage</th>
                    <th>Progress</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${codeLines.length}</td>
                    <td>${file.totalLines}</td>
                    <td>${file.coveredLines.length}</td>
                    <td>${file.uncoveredLines.length}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${file.coveragePercentage}%</td>
                    <td>
                        <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; width: 100px;">
                            <div style="background: ${statusColor}; height: 20px; width: ${file.coveragePercentage}%;"></div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div style="margin-bottom: 30px;">
            ${codeHTML}
        </div>
        </section>
        `;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RPGLE Code Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .summary { display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-around; margin-bottom: 20px; }
        .summary-link { text-decoration: none; color: inherit; min-width: 200px; flex: 1; max-width: 300px; }
        .summary-item { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 10px; transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
        .summary-link:hover .summary-item { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12); background: #efefef; }
        .summary-item h3 { margin: 0; color: #2196F3; font-size: 16px; }
        .summary-item p { margin: 5px 0 0 0; font-size: 14px; }
        .back-to-summary { color: #1565c0; font-size: 13px; font-weight: 600; text-decoration: none; }
        .back-to-summary:hover { text-decoration: underline; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 RPGLE Code Coverage Report</h1>
        <p>Generated on: ${new Date().toLocaleString('es-ES')}</p>
    </div>

    <div id="summary-top" class="summary">
        ${files.map((file, index) => {
            const fileName = getCleanFileName(file.filePath);
            const sectionAnchor = getSectionAnchor(file.filePath, index);
            const statusColor = getStatusColor(file.coveragePercentage);
            const totalFileLines = file.sourceCode ? file.sourceCode.length : file.totalLines + 20;

            return `
            <a href="#${sectionAnchor}" class="summary-link" title="Go to ${fileName} details">
                <div class="summary-item">
                    <h3>📄 ${fileName.toUpperCase()}</h3>
                    <div style="font-size: 14px; margin-top: 8px;">
                        <p style="margin: 2px 0;"><strong>Coverage:</strong> <span style="color: ${statusColor}; font-weight: bold;">${file.coveragePercentage}%</span></p>
                        <p style="margin: 2px 0;"><strong>Total Lines:</strong> ${totalFileLines}</p>
                        <p style="margin: 2px 0;"><strong>Executable Lines:</strong> ${file.totalLines}</p>
                        <p style="margin: 2px 0;"><strong>Covered:</strong> <span style="color: #4CAF50;">${file.coveredLines.length}</span></p>
                        <p style="margin: 2px 0;"><strong>Uncovered:</strong> <span style="color: #F44336;">${file.uncoveredLines.length}</span></p>
                    </div>
                </div>
            </a>`;
        }).join('')}
    </div>

    <h2>📁 Detail by Component Analyzed</h2>
    ${filesHTML}

    <div class="footer">
        <p>Report generated by RPGLE Code Coverage Extension for Visual Studio Code</p>
    </div>
</body>
</html>
    `;
    }

    async function generateReport() {
        const outputChannel = getOutputChannel();
        const coverageData = getCoverageData();
        let reportsDir, extensionPath;

        try {
            if (coverageData.size === 0) {
                vscode.window.showWarningMessage('There is no coverage data. Run the analysis first.');
                return;
            }

            const config = vscode.workspace.getConfiguration('rpgleCoverage');
            const outputFormat = config.get('outputFormat') || 'PDF';
            outputChannel.appendLine(`Formato de salida configurado: ${outputFormat}`);

            const hasRemoteFiles = Array.from(coverageData.keys()).some(p => p.startsWith('member:'));
            if (hasRemoteFiles) {
                vscode.window.showInformationMessage('The report is being generated, please wait.');
            }

            const extension = vscode.extensions.getExtension('balrocj.rpgle-code-coverage');
            if (!extension) {
                vscode.window.showErrorMessage('Could not find installed extension');
                return;
            }

            extensionPath = extension.extensionPath;
            outputChannel.appendLine(`Ruta de instalación de extensión: ${extensionPath}`);

            reportsDir = path.join(extensionPath, 'coverage-reports');
            outputChannel.appendLine(`Directorio de reportes: ${reportsDir}`);

            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
                outputChannel.appendLine('Directorio de reportes creado');
            }

            const coverageEntries = Array.from(coverageData.values());
            const generateSeparateReports = config.get('splitMultipleReports', false) && coverageEntries.length > 1;
            const outputReports = [];
            const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                new Date().toTimeString().split(' ')[0].replace(/:/g, '');

            const sanitizeForFileName = (value) => String(value || 'component')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'component';

            const createReportBaseName = (suffix) => {
                return suffix ? `coverage-report-${runTimestamp}-${suffix}` : `coverage-report-${runTimestamp}`;
            };

            const createHtmlReport = async (filesForReport, suffix) => {
                const htmlContent = await generateReportHTML(filesForReport);
                const baseName = createReportBaseName(suffix);
                const targetHtmlPath = path.join(reportsDir, `${baseName}.html`);
                fs.writeFileSync(targetHtmlPath, htmlContent);
                outputChannel.appendLine(`Reporte HTML generado: ${targetHtmlPath}`);
                outputReports.push({ type: 'HTML', path: targetHtmlPath });
            };

            const createPdfReport = async (filesForReport, suffix) => {
                const htmlContent = await generateReportHTML(filesForReport);
                const baseName = createReportBaseName(suffix);
                const targetPdfPath = path.join(reportsDir, `${baseName}.pdf`);
                const tempHtmlPath = path.join(reportsDir, `${baseName}.html`);

                fs.writeFileSync(tempHtmlPath, htmlContent);

                try {
                    outputChannel.appendLine('🔄 Iniciando generación de PDF...');

                    const bundledChromePath = path.join(extensionPath, 'chromium', 'chrome-win64', 'chrome.exe');

                    if (!fs.existsSync(bundledChromePath)) {
                        throw new Error('Bundled Chrome not found for PDF generation');
                    }

                    const launchOptions = {
                        executablePath: bundledChromePath,
                        headless: true,
                        timeout: 30000,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--disable-extensions'
                        ]
                    };

                    outputChannel.appendLine(`📦 Using bundled Chrome for PDF: ${bundledChromePath}`);

                    const browser = await puppeteer.launch(launchOptions);
                    const page = await browser.newPage();

                    await page.setViewport({ width: 1200, height: 800 });
                    await page.setContent(htmlContent, {
                        waitUntil: 'networkidle0',
                        timeout: 30000
                    });

                    outputChannel.appendLine('📄 Generando archivo PDF...');
                    await page.pdf({
                        path: targetPdfPath,
                        format: 'A4',
                        printBackground: true,
                        margin: {
                            top: '1in',
                            right: '0.5in',
                            bottom: '1in',
                            left: '0.5in'
                        }
                    });
                    await browser.close();

                    try {
                        fs.unlinkSync(tempHtmlPath);
                        outputChannel.appendLine(`Archivo HTML temporal eliminado: ${tempHtmlPath}`);
                    } catch (error) {
                        outputChannel.appendLine(`Warning: No se pudo eliminar HTML temporal: ${error.message}`);
                    }

                    outputChannel.appendLine(`Reporte PDF generado: ${targetPdfPath}`);
                    outputReports.push({ type: 'PDF', path: targetPdfPath });
                } catch (pdfError) {
                    outputChannel.appendLine(`Error generando PDF: ${pdfError.message}`);
                    outputChannel.appendLine('Generando reporte HTML como alternativa...');
                    const fallbackHtmlPath = path.join(reportsDir, `${baseName}-fallback.html`);
                    fs.writeFileSync(fallbackHtmlPath, htmlContent);
                    outputChannel.appendLine(`Reporte HTML generado como alternativa: ${fallbackHtmlPath}`);
                    outputReports.push({ type: 'HTML', path: fallbackHtmlPath });
                }
            };

            const reportGroups = generateSeparateReports
                ? coverageEntries.map((coverageItem, index) => ({
                    files: [coverageItem],
                    suffix: sanitizeForFileName(`${index + 1}-${getCleanFileName(coverageItem.filePath)}`)
                }))
                : [{ files: coverageEntries, suffix: '' }];

            if (generateSeparateReports) {
                outputChannel.appendLine(`Modo reportes separados activado. Se generaran ${reportGroups.length} reporte(s).`);
            }

            if (outputFormat === 'HTML') {
                for (const reportGroup of reportGroups) {
                    await createHtmlReport(reportGroup.files, reportGroup.suffix);
                }
            } else {
                const canGeneratePdf = await isPdfAvailable();

                if (canGeneratePdf) {
                    for (const reportGroup of reportGroups) {
                        await createPdfReport(reportGroup.files, reportGroup.suffix);
                    }
                } else {
                    for (const reportGroup of reportGroups) {
                        await createHtmlReport(reportGroup.files, reportGroup.suffix);
                    }
                    outputChannel.appendLine('Para generar PDFs, instale Chrome/Chromium o ejecute: npm run postinstall');
                }
            }

            const generatedPdf = outputReports.filter(report => report.type === 'PDF');
            const generatedHtml = outputReports.filter(report => report.type === 'HTML');

            const primaryReport = generatedPdf[0] || generatedHtml[0];
            const multipleReports = outputReports.length > 1;

            if (!primaryReport) {
                vscode.window.showWarningMessage('No coverage report could be generated.');
                return;
            }

            const openLabel = multipleReports
                ? 'Open Reports'
                : (primaryReport.type === 'PDF' ? 'Open PDF' : 'Open HTML');
            const generatedMessage = primaryReport.type === 'PDF'
                ? `✅ ${multipleReports ? 'Coverage reports' : 'PDF report'} generated successfully!\n📁 Reports folder: ${path.basename(reportsDir)}\n📂 Extension folder: ${extensionPath}`
                : `✅ ${multipleReports ? 'Coverage reports' : 'HTML report'} generated successfully!\n📁 Reports folder: ${path.basename(reportsDir)}\n📂 Extension folder: ${extensionPath}`;

            vscode.window.showInformationMessage(generatedMessage, 'Open Folder', openLabel).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.env.openExternal(vscode.Uri.file(reportsDir));
                } else if (selection === openLabel) {
                    if (multipleReports) {
                        outputReports.forEach(report => {
                            vscode.env.openExternal(vscode.Uri.file(report.path));
                        });
                    } else {
                        vscode.env.openExternal(vscode.Uri.file(primaryReport.path));
                    }
                }
            });
        } catch (error) {
            logger.error('Error generando PDF:', error);
            vscode.window.showErrorMessage(`Error generating PDF: ${error.message}`);
            if (reportsDir && fs.existsSync(reportsDir)) {
                vscode.window.showInformationMessage('Open reports folder to review generated files?', 'Open Folder')
                    .then(selection => {
                        if (selection === 'Open Folder') {
                            vscode.env.openExternal(vscode.Uri.file(reportsDir));
                        }
                    });
            }
        }
    }

    return { generateReport };
}

module.exports = { createReportCommands };
