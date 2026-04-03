const vscode = require('vscode');
const logger = require('./Logger');

/**
 * Tree Data Provider para archivos de cobertura disponibles
 */
class AvailableCoverageProvider {
    constructor(coverageExecutor) {
        this.coverageExecutor = coverageExecutor;
        this.availableFiles = [];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        
        logger.debug('AvailableCoverageProvider creado con coverageExecutor:', !!coverageExecutor);
    }

    refresh() {
        logger.debug('REFRESH LLAMADO');
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        logger.debug('getChildren llamado', !!element);
        
        if (!element) {
            // Root level - mostrar archivos de cobertura disponibles
            try {
                await this.loadAvailableFiles();
                logger.debug(`Devolviendo ${this.availableFiles.length} archivos`);
                return this.availableFiles.map(file => new CoverageFileItem(file));
            } catch (error) {
                logger.error('Error cargando archivos de cobertura:', error);
                logger.error('Stack trace:', error.stack);
                return [];
            }
        }
        return [];
    }

    async loadAvailableFiles() {
        try {
            logger.debug('loadAvailableFiles INICIO');
            
            if (!this.coverageExecutor) {
                logger.error('No hay coverageExecutor disponible');
                vscode.window.showErrorMessage('Error: No coverageExecutor available');
                this.availableFiles = [];
                return;
            }

            // Inicializar la conexión dinámicamente si no existe
            if (!this.coverageExecutor.connection) {
                logger.info('Inicializando conexión con IBM i...');
                vscode.window.showInformationMessage('Connecting with IBM i...');
                
                const initialized = await this.coverageExecutor.initialize();
                if (!initialized) {
                    logger.error('No se pudo inicializar la conexión');
                    vscode.window.showErrorMessage('Error: Could not connect to IBM i. Verify that Code for IBM i is connected.');
                    this.availableFiles = [];
                    return;
                }
            }

            logger.debug('Llamando a listAvailableCoverageFiles...');
            vscode.window.showInformationMessage('Searching for .cczip files on IBM i...');
            
            // Usar la función del coverageExecutor para listar archivos
            this.availableFiles = await this.coverageExecutor.listAvailableCoverageFiles();
            logger.info(`Archivos cargados: ${this.availableFiles.length}`);
            
            if (this.availableFiles.length === 0) {
                vscode.window.showInformationMessage('No .cczip files were found in the IBM i home directory');
            } else {
                vscode.window.showInformationMessage(`${this.availableFiles.length} files .cczip files were found`);
            }
            
        } catch (error) {
            logger.error('Error listando archivos de cobertura:', error);
            logger.error('Stack trace:', error.stack);
            vscode.window.showErrorMessage(`Error loading files: ${error.message}`);
            this.availableFiles = [];
        }
    }

    async processCoverageFile(fileItem) {
        try {
            logger.debug('processCoverageFile', fileItem);
            
            if (!fileItem || !fileItem.coverageFile) {
                throw new Error('Invalid coverage file');
            }

            const file = fileItem.coverageFile;
            vscode.window.showInformationMessage(`Processing ${file.name}...`);

            // Procesar el archivo usando el coverageExecutor
            const coverageResults = await this.coverageExecutor.processCoverageFileFromHome(file.name);

            if (coverageResults) {
                vscode.window.showInformationMessage(`✅ File ${file.name} processed successfully`);
                
                // Agregar los resultados a la vista principal usando el comando processResults
                vscode.commands.executeCommand('rpgleCoverage.processResults', coverageResults);
            } else {
                throw new Error('Coverage data could not be obtained');
            }

        } catch (error) {
            logger.error('Error procesando archivo de cobertura:', error);
            vscode.window.showErrorMessage(`Error processing file: ${error.message}`);
        }
    }

    async deleteCoverageFile(fileItem) {
        try {
            if (!fileItem || !fileItem.coverageFile) {
                throw new Error('Invalid coverage file');
            }

            const file = fileItem.coverageFile;
            
            // Confirmar eliminación - "No" es la opción por defecto para seguridad
            const result = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${file.name}"?`,
                { modal: true },
                'No',
                'Yes, Delete'
            );

            if (result === 'Yes, Delete') {
                // Eliminar archivo usando la conexión directamente
                try {
                    const content = this.coverageExecutor.connection.getContent();
                    await content.deleteFile(file.path);
                    
                    vscode.window.showInformationMessage(`✅ File ${file.name} removed`);
                    
                    // Refrescar la vista
                    this.refresh();
                } catch (deleteError) {
                    logger.error('Error deleting file:', deleteError);
                    // Intentar con comando rm como fallback
                    try {
                        const connection = this.coverageExecutor.connection;
                        await connection.sendCommand({
                            command: `rm -f "${file.path}"`,
                            directory: '/tmp'
                        });
                        
                        vscode.window.showInformationMessage(`✅ File ${file.name} removed with alternative method`);
                        this.refresh();
                    } catch (rmError) {
                        throw new Error(`The file could not be deleted: ${deleteError.message}`);
                    }
                }
            }

        } catch (error) {
            logger.error('Error eliminando archivo de cobertura:', error);
            vscode.window.showErrorMessage(`Error deleting file: ${error.message}`);
        }
    }
}

/**
 * Item del árbol para un archivo de cobertura
 */
class CoverageFileItem extends vscode.TreeItem {
    constructor(coverageFile) {
        const label = `${coverageFile.name}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        
        this.coverageFile = coverageFile;
        this.contextValue = 'coverageFile';
        this.tooltip = this.buildTooltip(coverageFile);
        this.description = this.buildDescription(coverageFile);
        this.iconPath = new vscode.ThemeIcon('file-zip');
        
        // Comando para procesar archivo al hacer clic
        this.command = {
            command: 'rpgleCoverage.processCoverageFile',
            title: 'Process coverage file',
            arguments: [this]
        };
        
        logger.debug('CoverageFileItem creado:', coverageFile.name);
    }

    buildDescription(file) {
        // Mostrar fecha y tamaño
        const date = new Date(file.modified);
        const dateStr = this.formatDate(date);
        const sizeStr = this.formatSize(file.size);
        return `${dateStr} • ${sizeStr}`;
    }

    buildTooltip(file) {
        const date = new Date(file.modified);
        const dateStr = date.toLocaleString();
        const sizeStr = this.formatSize(file.size);
        
        return `File: ${file.name}\nPath: ${file.path}\nSize: ${sizeStr}\nModified: ${dateStr}\n\nClick to process this coverage file`;
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Hoy ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Ayer ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return `${diffDays} días`;
        } else {
            return date.toLocaleDateString('es-ES');
        }
    }

    formatSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1048576) {
            return Math.round(bytes / 1024) + ' KB';
        } else {
            return Math.round(bytes / 1048576) + ' MB';
        }
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
module.exports = { AvailableCoverageProvider };