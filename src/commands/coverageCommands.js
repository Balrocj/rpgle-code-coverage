'use strict';

/**
 * Crea comandos relacionados con la ejecucion de cobertura.
 * Se mantiene la logica existente para evitar regresiones.
 */
function createCoverageCommands(deps) {
    const {
        vscode,
        logger,
        readTestingConfig,
        getCleanFileName,
        normalizeUri,
        updateDecorations,
        generateReport,
        getCoverageExecutor,
        getIbmiIntegration,
        getOutputChannel,
        getCoverageData,
        getTreeDataProvider
    } = deps;

    async function runCoverage() {
        try {
            await executeCoverageAnalysis();
        } catch (error) {
            vscode.window.showErrorMessage('Error executing coverage: ' + error.message);
        }
    }

    async function executeCoverageAnalysis() {
        const outputChannel = getOutputChannel();
        const coverageExecutor = getCoverageExecutor();
        const ibmiIntegration = getIbmiIntegration();
        const coverageData = getCoverageData();
        const treeDataProvider = getTreeDataProvider();

        vscode.window.showInformationMessage('Running coverage analysis...');

        outputChannel.appendLine('Inicializando conexion con IBM i...');
        const initialized = await coverageExecutor.initialize();

        if (!initialized) {
            const errorMsg = 'A connection to IBM i could not be established. Verify that Code for IBM i is connected.';
            vscode.window.showErrorMessage(errorMsg);
            outputChannel.appendLine('ERROR: ' + errorMsg);
            return;
        }

        outputChannel.appendLine('✅ Conexion con IBM i establecida exitosamente');

        if (ibmiIntegration && ibmiIntegration.isConnected()) {
            outputChannel.appendLine('🔍 Validando bibliotecas necesarias...');

            try {
                const validation = await ibmiIntegration.validateLibraries(['QDEVTOOLS']);

                if (!validation.valid) {
                    outputChannel.appendLine('⚠️  Bibliotecas faltantes detectadas: ' + validation.missingLibraries.join(', '));

                    const choice = await ibmiIntegration.showLibraryWarning(
                        validation.missingLibraries,
                        'code coverage analysis'
                    );

                    if (choice === 'Don\'t Show Again') {
                        outputChannel.appendLine('📝 Usuario eligio no mostrar mas advertencias de bibliotecas');
                    } else if (choice === undefined) {
                        outputChannel.appendLine('❌ Analisis cancelado por el usuario');
                        return;
                    }
                } else {
                    outputChannel.appendLine('✅ Todas las bibliotecas necesarias estan disponibles');
                }

                const codecovAvailable = await ibmiIntegration.checkCodecovAvailability();
                if (!codecovAvailable) {
                    outputChannel.appendLine('⚠️  Warning: CODECOV command may not be available');
                }

            } catch (error) {
                outputChannel.appendLine('⚠️  Warning: Could not validate libraries: ' + error.message);
            }
        }

        let files = [];
        outputChannel.appendLine('📁 Modo: Ejecutar cobertura usando configuracion JSON');

        const testingConfig = readTestingConfig();

        if (testingConfig && testingConfig.codecov && testingConfig.codecov.modules) {
            outputChannel.appendLine('📋 Configuracion encontrada en ConfigCoverage.json');
            outputChannel.appendLine('📋 Configuracion: ' + JSON.stringify(testingConfig.codecov, null, 2));

            const codecovConfig = testingConfig.codecov;

            if (!codecovConfig.programToExecute) {
                const errorMsg = 'ERROR: programToExecute is required in the codecov configuration. Please configure the program execution command.';
                vscode.window.showErrorMessage(errorMsg);
                outputChannel.appendLine(errorMsg);
                return;
            }

            const modules = Array.isArray(testingConfig.codecov.modules)
                ? testingConfig.codecov.modules
                : [testingConfig.codecov.modules];

            files = [];
            for (const moduleSpec of modules) {
                outputChannel.appendLine(`Procesando modulo: ${moduleSpec}`);

                let moduleInfo;
                const parts = moduleSpec.split(' ')[0];
                const program = parts.split('/')[1] || parts;

                if (!program) {
                    const errorMsg = `Module error ${moduleSpec}: Invalid format. Expected LIBRARY/PROGRAM or PROGRAM`;
                    vscode.window.showErrorMessage(errorMsg);
                    outputChannel.appendLine(`ERROR: ${errorMsg}`);
                    return;
                }

                moduleInfo = {
                    type: 'simplified',
                    moduleSpec: moduleSpec,
                    program: program,
                    programToExecute: testingConfig.codecov.programToExecute,
                    modulesToAnalyze: ''
                };

                outputChannel.appendLine('🧪 Modo simplificado activado:');
                outputChannel.appendLine(`   - Program: "${program}"`);
                outputChannel.appendLine('   - Extraccion automatica: library, sourceFile y sourceMember se detectaran del resultado CODECOV XML');

                files.push(moduleInfo);
            }

            outputChannel.appendLine(`Archivos a procesar desde configuracion: ${files.length}`);
        } else {
            let errorMsg = 'No se encontro configuracion valida en ConfigCoverage.json. ';

            if (!testingConfig) {
                errorMsg += 'El archivo ConfigCoverage.json no existe o no se pudo leer.';
            } else if (!testingConfig.codecov) {
                errorMsg += 'Falta la seccion "codecov" en la configuracion.';
            } else if (!testingConfig.codecov.modules || (Array.isArray(testingConfig.codecov.modules) && testingConfig.codecov.modules.length === 0)) {
                errorMsg += 'Falta el campo "modules" en la seccion codecov o esta vacio.';
            }

            errorMsg += ' Use the settings panel to configure all the necessary parameters.';

            vscode.window.showErrorMessage(errorMsg);
            outputChannel.appendLine('ERROR: ' + errorMsg);
            return;
        }

        coverageData.clear();

        let modulesToAnalyze = '';
        let displayNames = [];
        let consolidatedModuleInfo = null;

        for (const moduleInfo of files) {
            let displayName = '';
            if (moduleInfo.type === 'simplified') {
                displayName = `${moduleInfo.program}`;
            } else {
                displayName = getCleanFileName(moduleInfo);
            }
            displayNames.push(displayName);

            modulesToAnalyze = modulesToAnalyze + `(${moduleInfo.moduleSpec})` + ' ';

            if (!consolidatedModuleInfo) {
                consolidatedModuleInfo = { ...moduleInfo };
            }
        }

        if (consolidatedModuleInfo) {
            consolidatedModuleInfo.modulesToAnalyze = modulesToAnalyze.trim();
        }

        try {
            vscode.window.showInformationMessage(`Analyzing ${displayNames.join(', ')}...`);
            outputChannel.appendLine(`Analizando modulos: ${displayNames.join(', ')}`);

            coverageExecutor.setOutputChannel(outputChannel);

            const coverageResults = await coverageExecutor.executeCoverage(consolidatedModuleInfo);
            const coverageArray = Array.isArray(coverageResults) ? coverageResults : [coverageResults];

            if (coverageArray && coverageArray.length > 0) {
                outputChannel.appendLine(`✅ Procesando ${coverageArray.length} resultado(s) de cobertura...`);

                for (const coverage of coverageArray) {
                    const normalizedFilePath = normalizeUri(coverage.filePath);
                    coverageData.set(normalizedFilePath, coverage);

                    const displayName = getCleanFileName(coverage.filePath);
                    const percentageInfo = `${coverage.coveragePercentage}% (${coverage.coveredLines.length}/${coverage.totalLines} lines)`;
                    const filterApplied = coverage.totalLines !== 50 ? ' [FILTER APPLIED]' : ' [NO FILTER]';

                    outputChannel.appendLine(`Coverage obtained for ${displayName}: ${percentageInfo}${filterApplied}`);
                    outputChannel.appendLine(`- Total lines reported: ${coverage.totalLines}`);
                    outputChannel.appendLine(`- Covered lines: ${coverage.coveredLines.length}`);
                    outputChannel.appendLine(`- Uncovered lines: ${coverage.uncoveredLines.length}`);
                }

                outputChannel.appendLine(`✅ Total: ${coverageArray.length} modulo(s) procesado(s) exitosamente`);
            }
        } catch (error) {
            logger.error('Error analizando modulos:', error);
            vscode.window.showWarningMessage(`Coverage analysis failed: ${error.message}`);
            outputChannel.appendLine(`ERROR analizando modulos: ${error.message}`);
            throw error;
        }

        treeDataProvider.refresh();
        updateDecorations();

        const message = `Coverage executed for ${files.length} file(s)`;
        vscode.window.showInformationMessage(message);

        try {
            vscode.window.showInformationMessage('Generating report automatically...');
            await generateReport();
        } catch (error) {
            logger.error('Error generando reporte automatico:', error);
            vscode.window.showWarningMessage('Error generating automatic report: ' + error.message);
        }
    }

    return {
        runCoverage
    };
}

module.exports = {
    createCoverageCommands
};
