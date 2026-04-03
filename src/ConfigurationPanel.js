const vscode = require('vscode');
const { createConfigurationStorageService } = require('./services/configurationStorageService');
const { createConfigurationPanelMessageHandler } = require('./services/configurationPanelMessageHandler');
const { getConfigurationPanelTemplate } = require('./ui/configurationPanelTemplate');

/**
 * Panel de configuracin moderno para RPGLE Code Coverage
 * Permite editar la configuracin codecov a travs de una interfaz web moderna
 */
class ConfigurationPanel {
    constructor(extensionPath, outputChannel) {
        this.extensionPath = extensionPath;
        this.outputChannel = outputChannel;
        this.panel = null;
        this.configurationStorageService = createConfigurationStorageService({ vscode });
        this.messageHandler = null;
    }

    /**
     * Crear y mostrar el panel de configuracin
     */
    createPanel() {
        // Si ya hay un panel abierto, enfocarlo
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Crear nuevo panel webview
        this.panel = vscode.window.createWebviewPanel(
            'rpgleCoverageConfig',
            'RPGLE Code Coverage Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Configurar el contenido HTML
        this.panel.webview.html = this.getWebviewContent();

        this.messageHandler = createConfigurationPanelMessageHandler({
            vscode,
            outputChannel: this.outputChannel,
            extensionPath: this.extensionPath,
            configurationStorageService: this.configurationStorageService,
            closePanel: () => {
                if (this.panel) {
                    this.panel.dispose();
                }
            },
            postMessage: (payload) => {
                if (this.panel) {
                    this.panel.webview.postMessage(payload);
                }
            }
        });

        // Manejar mensajes del webview
        this.panel.webview.onDidReceiveMessage(
            message => this.messageHandler.handleMessage(message),
            undefined,
            []
        );

        // Limpiar referencia cuando se cierre el panel
        this.panel.onDidDispose(
            () => {
                this.panel = null;
                this.messageHandler = null;
            },
            null,
            []
        );

        // Cargar configuracin actual
        this.messageHandler.handleMessage({ command: 'load' });
    }

    /**
     * Generar el contenido HTML del webview
     */
    getWebviewContent() {
        return getConfigurationPanelTemplate();
    }

}

module.exports = ConfigurationPanel;


