const vscode = require('vscode');

/**
 * Integración con la extensión Code for IBM i
 * Proporciona acceso a la configuración de bibliotecas y conexión IBM i
 */
class IBMiIntegration {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.codeForIBMi = null;
        this.instance = null;
    }

    /**
     * Inicializar la integración con Code for IBM i
     */
    async initialize() {
        try {
            // Obtener la extensión Code for IBM i
            const baseExtension = vscode.extensions.getExtension('halcyontechltd.code-for-ibmi');
            
            if (!baseExtension) {
                this.outputChannel.appendLine('⚠️  Code for IBM i extension not found');
                return false;
            }

            if (!baseExtension.isActive) {
                this.outputChannel.appendLine('⚠️  Code for IBM i extension not active');
                return false;
            }

            this.codeForIBMi = baseExtension.exports;
            this.instance = this.codeForIBMi?.instance;

            if (!this.instance) {
                this.outputChannel.appendLine('⚠️  No active IBM i connection found');
                return false;
            }

            this.outputChannel.appendLine('✅ Successfully integrated with Code for IBM i');
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error initializing IBM i integration: ${error.message}`);
            return false;
        }
    }

    /**
     * Verificar si hay una conexión activa a IBM i
     */
    isConnected() {
        return this.instance && this.instance.getConnection();
    }

    /**
     * Obtener la configuración de bibliotecas actual
     */
    async getLibraryList(workspaceFolder = null) {
        if (!this.isConnected()) {
            throw new Error('No active IBM i connection');
        }

        try {
            const connection = this.instance.getConnection();
            const libraryList = await this.instance.getLibraryList(connection, workspaceFolder);
            
            return {
                currentLibrary: libraryList.currentLibrary || '*NONE',
                libraryList: libraryList.libraryList || [],
                preUserLibraryList: libraryList.preUserLibraryList || []
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error getting library list: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validar que las bibliotecas necesarias estén disponibles
     */
    async validateLibraries(requiredLibraries = []) {
        if (!requiredLibraries.length) {
            requiredLibraries = ['QDEVTOOLS']; // QDEVTOOLS es necesario para CODECOV
        }

        try {
            const libraries = await this.getLibraryList();
            const allLibraries = [
                libraries.currentLibrary,
                ...libraries.preUserLibraryList,
                ...libraries.libraryList
            ].filter(lib => lib && lib !== '*NONE');

            const missingLibraries = [];
            const foundLibraries = [];

            for (const required of requiredLibraries) {
                if (allLibraries.includes(required)) {
                    foundLibraries.push(required);
                } else {
                    missingLibraries.push(required);
                }
            }

            return {
                valid: missingLibraries.length === 0,
                foundLibraries,
                missingLibraries,
                allLibraries
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error validating libraries: ${error.message}`);
            return {
                valid: false,
                foundLibraries: [],
                missingLibraries: requiredLibraries,
                allLibraries: [],
                error: error.message
            };
        }
    }

    /**
     * Obtener información de la conexión IBM i
     */
    getConnectionInfo() {
        if (!this.isConnected()) {
            return null;
        }

        try {
            const connection = this.instance.getConnection();
            const config = connection.getConfig();
            
            return {
                host: config.host,
                username: config.username,
                currentLibrary: config.currentLibrary,
                libraryList: config.libraryList || [],
                homeDirectory: config.homeDirectory
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error getting connection info: ${error.message}`);
            return null;
        }
    }

    /**
     * Ejecutar comando en IBM i usando el entorno correcto
     */
    async executeCommand(command, environment = 'ile') {
        if (!this.isConnected()) {
            throw new Error('No active IBM i connection');
        }

        try {
            const connection = this.instance.getConnection();
            
            // Para comandos IBM i, usar runCommand con environment 'ile'
            const result = await connection.runCommand({
                command: command,
                environment: environment
            });

            return {
                success: result.code === 0 || result.code === null,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                code: result.code
            };
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error executing command: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verificar si el comando CODECOV está disponible
     */
    async checkCodecovAvailability() {
        try {
            const connection = this.instance.getConnection();
            const content = connection.getContent();
            
            if (content && typeof content.checkObject === 'function') {
                try {
                    const commandExists = await content.checkObject({
                        library: 'QDEVTOOLS',
                        name: 'CODECOV',
                        type: '*CMD'
                    });
                    
                    if (commandExists) {
                        this.outputChannel.appendLine('✅ CODECOV command is available in QDEVTOOLS');
                        return true;
                    } else {
                        this.outputChannel.appendLine('⚠️  CODECOV command not found in QDEVTOOLS');
                        return false;
                    }
                } catch (apiError) {
                    this.outputChannel.appendLine(`⚠️  API method failed, trying fallback: ${apiError.message}`);
                }
            }

            // Fallback: Intentar ejecutar el comando y ver si existe
            const result = await this.executeCommand('QDEVTOOLS/CODECOV');
            
            // Si el comando existe pero falla por falta de parámetros, eso significa que está disponible
            if (result.stderr && (
                result.stderr.includes('Required parameter') || 
                result.stderr.includes('CPF0001') ||
                result.stderr.includes('Parameter') ||
                result.stderr.includes('CMD') ||
                result.code !== 0 // El comando falló pero existe
            )) {
                this.outputChannel.appendLine('✅ CODECOV command exists (parameter validation triggered)');
                return true;
            }

            this.outputChannel.appendLine('⚠️  CODECOV command not found or not accessible');
            this.outputChannel.appendLine(`   Debug info - stdout: "${result.stdout}", stderr: "${result.stderr}", code: ${result.code}`);
            return false;
            
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error checking CODECOV availability: ${error.message}`);
            return false;
        }
    }

    /**
     * Mostrar advertencia sobre bibliotecas faltantes
     */
    async showLibraryWarning(missingLibraries, context = 'code coverage') {
        if (!missingLibraries.length) {
            return;
        }

        const message = `The following libraries are missing from the library list and may impact ${context}: ${missingLibraries.join(', ')}`;
        
        const choice = await vscode.window.showWarningMessage(
            message,
            'View Library List',
            'Ignore',
            'Don\'t Show Again'
        );

        if (choice === 'View Library List') {
            try {
                const libraries = await this.getLibraryList();
                const info = `
Current Library: ${libraries.currentLibrary}

Pre-User Library List:
${libraries.preUserLibraryList.map(lib => `  ${lib}`).join('\n')}

User Library List:
${libraries.libraryList.map(lib => `  ${lib}`).join('\n')}
                `.trim();

                await vscode.window.showInformationMessage(
                    'Current IBM i Library Configuration',
                    { modal: true, detail: info }
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Error retrieving library list: ${error.message}`);
            }
        }

        return choice;
    }
}

module.exports = IBMiIntegration;