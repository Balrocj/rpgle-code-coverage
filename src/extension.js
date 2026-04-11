const vscode = require('vscode');
const path = require('path');
const configurationPanel = require('./ConfigurationPanel');
const ibmiIntegrationModule = require('./ibmiIntegration');
// eslint-disable-next-line camelcase
const { AvailableCoverageProvider: availableCoverageProviderClass } = require('./AvailableCoverageProvider');
const logger = require('./Logger');
const { registerCommands } = require('./commands');
const { createCoverageCommands } = require('./commands/coverageCommands');
const { createManagementCommands } = require('./commands/managementCommands');
const { createNavigationCommands } = require('./commands/navigationCommands');
const { createReportCommands } = require('./commands/reportCommands');
const { createResultCommands } = require('./commands/resultCommands');
const { createStateCommands } = require('./commands/stateCommands');
const { createPdfService } = require('./services/pdfService');
const { coverageTreeDataProviderClass } = require('./ui/CoverageTreeDataProvider');
const { createDecorations } = require('./ui/decorations');
const { normalizeUri, getCleanFileName } = require('./utils/pathUtils');
const { realCoverageExecutor: coverageExecutorClass, readTestingConfig } = require('./CodeCoverage');

let coverageData = new Map();
let treeDataProvider;
let availableCoverageProvider;
let decorationType;
let coverageExecutor;
let decorationsController;
let pdfService;
let outputChannel; // Canal de output para logs
let configPanel; // Panel de configuración
let ibmiIntegration; // Integración con Code for IBM i

function activate(context) {
    // Crear canal de output
    outputChannel = vscode.window.createOutputChannel('RPGLE Code Coverage');
    context.subscriptions.push(outputChannel);
    
    // Initialize logger with output channel
    logger.initialize(outputChannel);
    logger.info('RPGLE Code Coverage Extension ACTIVATING');

    pdfService = createPdfService({
        vscode,
        getOutputChannel: () => outputChannel,
        getExtensionPath: () => context.extensionPath
    });
    
    outputChannel.appendLine('RPGLE Code Coverage Extension activada');
    logger.debug('Output channel created');

    // Inicializar integración con IBM i
    logger.debug('Initializing IBM i integration');
    ibmiIntegration = new ibmiIntegrationModule(outputChannel);
    
    // Inicializar executor de cobertura
    logger.debug('Initializing coverage executor');
    coverageExecutor = new coverageExecutorClass();
    
    // Inicializar panel de configuración
    logger.debug('Initializing configuration panel');
    configPanel = new configurationPanel(context.extensionPath, outputChannel);
    
    // Intentar inicializar conexión en background (sin bloquear la activación)
    Promise.all([
        coverageExecutor.initialize(),
        ibmiIntegration.initialize()
    ]).then(([executorInitialized, ibmiInitialized]) => {
        if (executorInitialized) {
            outputChannel.appendLine('✅ Conexión con IBM i pre-inicializada exitosamente');
    } else {
        outputChannel.appendLine('ℹ️  Info: IBM i connection will be established when running coverage analysis');
    }        if (ibmiInitialized) {
            outputChannel.appendLine('✅ Integración con Code for IBM i establecida');
        } else {
            outputChannel.appendLine('ℹ️  Info: Code for IBM i integration will be available when connected');
        }
    }).catch(error => {
        outputChannel.appendLine('❌ Warning: Error en pre-inicialización: ' + error.message);
    });

    // Initialize PDF components with bundled Chromium
    pdfService.initializePdfComponentsInBackground();

    // Crear tipo de decoración para líneas cubiertas y no cubiertas
    decorationType = {
        covered: vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            overviewRulerColor: 'green',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            gutterIconPath: path.join(__filename, '..', '..', 'assets', 'covered.svg'),
            gutterIconSize: 'contain'
        }),
        uncovered: vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            overviewRulerColor: 'red',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            gutterIconPath: path.join(__filename, '..', '..', 'assets', 'uncovered.svg'),
            gutterIconSize: 'contain'
        })
    };

    // Proveedor de datos para el árbol
    logger.debug('Creating coverage tree data provider');
    treeDataProvider = new coverageTreeDataProviderClass({
        vscode,
        getCoverageData: () => coverageData,
        getCleanFileName
    });
    const coverageTreeView = vscode.window.createTreeView('coverageTreeView', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(coverageTreeView);
    logger.debug('Coverage tree view created');

    // Refrescar el panel automáticamente cuando cambien los umbrales de cobertura
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('rpgleCoverage.thresholds')) {
                treeDataProvider.refresh();
            }
        })
    );

    // Proveedor de datos para archivos de cobertura disponibles
    logger.debug('Creating available coverage provider with executor:', !!coverageExecutor);
    availableCoverageProvider = new availableCoverageProviderClass(coverageExecutor);
    logger.debug('Available coverage provider created');
    
    const availableCoverageTreeView = vscode.window.createTreeView('availableCoverageFiles', {
        treeDataProvider: availableCoverageProvider,
        showCollapseAll: false
    });
    context.subscriptions.push(availableCoverageTreeView);
    logger.debug('Available coverage tree view created and subscribed');

    // Forzar la apertura de la vista en el activity bar al activar la extensión
    setTimeout(() => {
        vscode.commands.executeCommand('workbench.view.extension.rpgleCoverage');
    }, 500);

    const reportCommands = createReportCommands({
        vscode,
        logger,
        getOutputChannel: () => outputChannel,
        getCoverageData: () => coverageData,
        getCleanFileName,
        isPdfAvailable: pdfService.isPdfAvailable
    });

    decorationsController = createDecorations({
        vscode,
        logger,
        normalizeUri,
        getOutputChannel: () => outputChannel,
        getCoverageData: () => coverageData,
        getDecorationType: () => decorationType
    });

    const coverageCommands = createCoverageCommands({
        vscode,
        logger,
        readTestingConfig,
        getCleanFileName,
        normalizeUri,
        updateDecorations: decorationsController.updateDecorations,
        generateReport: reportCommands.generateReport,
        getCoverageExecutor: () => coverageExecutor,
        getIbmiIntegration: () => ibmiIntegration,
        getOutputChannel: () => outputChannel,
        getCoverageData: () => coverageData,
        getTreeDataProvider: () => treeDataProvider
    });

    const managementCommands = createManagementCommands({
        vscode,
        logger,
        getOutputChannel: () => outputChannel,
        getConfigPanel: () => configPanel,
        getAvailableCoverageProvider: () => availableCoverageProvider,
        getCoverageExecutor: () => coverageExecutor
    });

    const navigationCommands = createNavigationCommands({
        vscode,
        logger,
        getOutputChannel: () => outputChannel,
        getCoverageData: () => coverageData
    });

    const resultCommands = createResultCommands({
        vscode,
        logger,
        getCoverageData: () => coverageData,
        getTreeDataProvider: () => treeDataProvider,
        getDecorationType: () => decorationType,
        getOutputChannel: () => outputChannel
    });

    const stateCommands = createStateCommands({
        vscode,
        logger,
        getCoverageData: () => coverageData,
        getTreeDataProvider: () => treeDataProvider,
        getDecorationType: () => decorationType,
        getCoverageExecutor: () => coverageExecutor,
        getDecorationsController: () => decorationsController
    });

    const commandCount = registerCommands(context, {
        runCoverage: coverageCommands.runCoverage,
        clearCoverage: stateCommands.clearCoverage,
        generateReport: reportCommands.generateReport,
        refreshView: stateCommands.refreshView,
        openFile: navigationCommands.openFile,
        openConfig: managementCommands.openConfig,
        openReportsFolder: managementCommands.openReportsFolder,
        refreshAvailableFiles: managementCommands.refreshAvailableFiles,
        processCoverageFile: managementCommands.processCoverageFile,
        deleteCoverageFile: managementCommands.deleteCoverageFile,
        selectLocalCoverageFile: managementCommands.selectLocalCoverageFile,
        testCoverageProvider: managementCommands.testCoverageProvider,
        processResults: resultCommands.processResults,
        showLastExecutionLog: managementCommands.showLastExecutionLog
    });

    context.subscriptions.push(decorationType.covered, decorationType.uncovered);

    // Agregar listener para cambios de editor activo - aplicar decoraciones automáticamente
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            // Aplicar decoraciones con un pequeño delay para asegurar que el editor esté listo
            setTimeout(() => {
                decorationsController.updateDecorations();
            }, 200);
        }
    });
    context.subscriptions.push(onDidChangeActiveTextEditor);

    // Aplicar decoraciones al editor activo actual si existe
    if (vscode.window.activeTextEditor) {
        setTimeout(() => {
            decorationsController.updateDecorations();
        }, 200);
    }

    logger.info(`All commands registered (${commandCount}), total subscriptions: ${context.subscriptions.length}`);
    logger.info('RPGLE Code Coverage Extension FULLY ACTIVATED');
}

function deactivate() {
    if (decorationType) {
        decorationType.covered.dispose();
        decorationType.uncovered.dispose();
    }
    
    // Limpiar recursos de cobertura
    if (coverageExecutor) {
        coverageExecutor.cleanup();
    }
}


module.exports = {
    activate,
    deactivate
};

