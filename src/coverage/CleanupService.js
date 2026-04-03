class CleanupService {
    constructor({ getConnection, log, logError, getHomeDirectory }) {
        this.getConnection = getConnection;
        this.log = log;
        this.logError = logError;
        this.getHomeDirectory = getHomeDirectory;
    }

    /**
     * Limpiar archivos temporales del IBM i
     */
    async cleanupTempFiles(tempStorage) {
        this.log('=== INICIO cleanupTempFiles ===');

        const connection = this.getConnection();
        if (!connection) {
            this.log('Warning: No hay conexión disponible para limpieza');
            return;
        }

        if (!tempStorage) {
            this.log('Warning: No hay tempStorage para limpiar');
            return;
        }

        this.log('tempStorage para limpiar: ' + JSON.stringify(tempStorage, null, 2));

        try {
            let filesDeleted = 0;
            let filesNotFound = 0;
            let errors = 0;

            // Limpiar archivo XML si existe
            if (tempStorage.xmlStmf) {
                const deleteResult = await this.deleteFileRobust(tempStorage.xmlStmf, 'XML');
                if (deleteResult === 'deleted') {
                    filesDeleted++;
                } else if (deleteResult === 'not_found') {
                    filesNotFound++;
                } else if (deleteResult === 'error') {
                    errors++;
                }
            }

            // Limpiar archivo ZIP de cobertura si existe
            if (tempStorage.ccStmf) {
                // Esperar un momento para asegurar que el archivo no esté en uso
                await new Promise(resolve => setTimeout(resolve, 1000));
                const deleteResult = await this.deleteFileRobust(tempStorage.ccStmf, 'ZIP');
                if (deleteResult === 'deleted') {
                    filesDeleted++;
                } else if (deleteResult === 'not_found') {
                    filesNotFound++;
                } else if (deleteResult === 'error') {
                    errors++;
                }
            }

            this.log(`=== RESUMEN LIMPIEZA: ${filesDeleted} eliminados, ${filesNotFound} no encontrados, ${errors} errores ===`);

        } catch (error) {
            this.logError(`Error durante limpieza de archivos temporales: ${error.message}`);
        }
    }

    /**
     * Función robusta para eliminar archivos que intenta varios métodos
     * Retorna: 'deleted', 'not_found', 'error'
     */
    async deleteFileRobust(filePath, fileType = 'archivo') {
        this.log(`Intentando eliminar ${fileType}: ${filePath}`);

        const connection = this.getConnection();
        if (!connection) {
            this.log(`Warning: No hay conexión para eliminar ${fileType}`);
            return 'error';
        }

        try {
            // Método 1: Intentar con getContent().deleteFile()
            try {
                const content = connection.getContent();
                if (content && typeof content.deleteFile === 'function') {
                    await content.deleteFile(filePath);
                    this.log(`✓ ${fileType} temporal eliminado (método 1): ${filePath}`);
                    return 'deleted';
                }
            } catch (contentError) {
                this.log(`Método 1 falló: ${contentError.message}`);
            }

            // Método 2: Intentar con comando rm
            try {
                await connection.sendCommand({
                    command: `rm -f "${filePath}"`,
                    directory: '/tmp'
                });
                this.log(`✓ ${fileType} temporal eliminado (método 2 - rm): ${filePath}`);
                return 'deleted';
            } catch (rmError) {
                this.log(`Método 2 (rm) falló: ${rmError.message}`);
            }

            // Método 3: Intentar con comando del sistema
            try {
                await connection.sendCommand({
                    command: `rm "${filePath}"`,
                    directory: '/home'
                });
                this.log(`✓ ${fileType} temporal eliminado (método 3 - rm home): ${filePath}`);
                return 'deleted';
            } catch (sysError) {
                this.log(`Método 3 (sistema) falló: ${sysError.message}`);
            }

            this.log(`Warning: No se pudo eliminar ${fileType} temporal ${filePath} con ningún método`);
            return 'error';

        } catch (error) {
            this.log(`Error completo eliminando ${fileType}: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
            if (error.message && error.message.includes('not found')) {
                this.log(`Info: ${fileType} temporal no encontrado (ya eliminado): ${filePath}`);
                return 'not_found';
            } else {
                this.log(`Warning: No se pudo eliminar ${fileType} temporal ${filePath}: ${error.message}`);
                return 'error';
            }
        }
    }

    /**
     * Forzar limpieza de archivos de cobertura temporales en el directorio home
     * Busca archivos .cczip y .xml con patrones de timestamp
     */
    async forceCleanupCoverageFiles() {
        this.log('=== INICIO LIMPIEZA FORZADA DE ARCHIVOS DE COBERTURA ===');

        const connection = this.getConnection();
        if (!connection) {
            this.log('Warning: No hay conexión disponible para limpieza forzada');
            return;
        }

        try {
            const homeDir = this.getHomeDirectory();
            this.log(`Buscando archivos temporales en: ${homeDir}`);

            // Patrones comunes para archivos de cobertura temporal
            const patterns = [
                `${homeDir}/*_*.cczip`,
                `${homeDir}/*_*.xml`,
                `${homeDir}/coverage_*.cczip`,
                `${homeDir}/cc_*.xml`
            ];

            let totalDeleted = 0;

            for (const pattern of patterns) {
                try {
                    this.log(`Buscando archivos con patrón: ${pattern}`);
                    // Nota: Este es un enfoque básico, podrías necesitar usar comandos del sistema
                    // para buscar archivos con wildcards si la API no lo soporta directamente
                } catch (error) {
                    this.log(`Error buscando patrón ${pattern}: ${error.message}`);
                }
            }

            this.log(`=== LIMPIEZA FORZADA COMPLETADA: ${totalDeleted} archivos eliminados ===`);

        } catch (error) {
            this.logError(`Error durante limpieza forzada: ${error.message}`);
        }
    }

    /**
     * Limpiar recursos temporales creados en ILEDITOR e IFS.
     * Aplica deduplicacion y reintentos para reducir basura en casos de error.
     */
    async cleanupCreatedResources(createdResources, context = '') {
        const connection = this.getConnection();
        if (!connection || !createdResources) {
            return { deleted: 0, errors: 0 };
        }

        const uniquePrograms = [...new Set(createdResources.programs || [])];
        const uniqueSourceFiles = [...new Set(createdResources.sourceFiles || [])];
        const uniqueTempFiles = [...new Set(createdResources.tempFiles || [])];

        let deleted = 0;
        let errors = 0;

        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

        const isNotFoundMessage = (text) => {
            const msg = String(text || '').toUpperCase();
            return msg.includes('CPF2105') || msg.includes('CPF9801') || msg.includes('NOT FOUND') || msg.includes('NO EXISTE');
        };

        const isRetryableLockError = (text) => {
            const msg = String(text || '').toUpperCase();
            return msg.includes('CPF2110') || msg.includes('IN USE') || msg.includes('LOCK');
        };

        const runDeleteWithRetry = async (command, environment, description) => {
            const maxAttempts = 3;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const result = await connection.runCommand({ command, environment });
                    const stderr = result?.stderr || '';

                    if (result?.code === 0) {
                        this.log(`✅ ${description} eliminado`);
                        return { ok: true, deleted: true };
                    }

                    if (isNotFoundMessage(stderr)) {
                        this.log(`ℹ️ ${description} no existe, se considera limpio`);
                        return { ok: true, deleted: false };
                    }

                    if (attempt < maxAttempts && isRetryableLockError(stderr)) {
                        this.log(`⏳ ${description} bloqueado, reintentando (${attempt}/${maxAttempts})...`);
                        await wait(700);
                        continue;
                    }

                    this.log(`⚠️ No se pudo eliminar ${description}: ${stderr || `code ${result?.code}`}`);
                    return { ok: false, deleted: false };
                } catch (error) {
                    if (attempt < maxAttempts) {
                        this.log(`⏳ Error temporal eliminando ${description}, reintentando (${attempt}/${maxAttempts}): ${error.message}`);
                        await wait(700);
                    } else {
                        this.log(`❌ Error eliminando ${description}: ${error.message}`);
                        return { ok: false, deleted: false };
                    }
                }
            }

            return { ok: false, deleted: false };
        };

        if (context) {
            this.log(`🧹 Limpieza de recursos (${context})`);
        }

        for (const program of uniquePrograms) {
            const result = await runDeleteWithRetry(`DLTOBJ OBJ(${program}) OBJTYPE(*PGM)`, 'ile', `programa ${program}`);
            if (result.deleted) { deleted++; }
            if (!result.ok) { errors++; }
        }

        for (const sourceFile of uniqueSourceFiles) {
            const result = await runDeleteWithRetry(`DLTOBJ OBJ(${sourceFile}) OBJTYPE(*FILE)`, 'ile', `archivo fuente ${sourceFile}`);
            if (result.deleted) { deleted++; }
            if (!result.ok) { errors++; }
        }

        for (const tempFile of uniqueTempFiles) {
            const escapedPath = String(tempFile).replace(/'/g, `'"'"'`);
            const result = await runDeleteWithRetry(`rm -f '${escapedPath}'`, 'pase', `temporal IFS ${tempFile}`);
            if (result.deleted) { deleted++; }
            if (!result.ok) { errors++; }
        }

        return { deleted, errors };
    }

    /**
     * Limpiar todos los archivos temporales creados en executeCoverageForConfig
     * Incluye archivos temporales IFS, programas CL en ILEDITOR y archivos fuente
     */
    async cleanupAllTempFilesInConfig(tempStorage, createdResources = null) {
        this.log('=== INICIO LIMPIEZA COMPLETA DE ARCHIVOS TEMPORALES ===');

        const connection = this.getConnection();
        if (!connection) {
            this.log('Warning: No hay conexión disponible para limpieza completa');
            return;
        }

        let totalDeleted = 0;
        let totalErrors = 0;

        try {
            // 1. Limpiar archivos temporales estándar (ccStmf, xmlStmf) usando método existente
            if (tempStorage) {
                this.log('🧹 Limpiando archivos temporales estándar...');
                try {
                    await this.cleanupTempFiles(tempStorage);
                    this.log('✅ Archivos temporales estándar limpiados');
                } catch (error) {
                    this.log(`❌ Error limpiando archivos estándar: ${error.message}`);
                    totalErrors++;
                }
            }

            // 2. Limpiar recursos específicos de executeCoverageForConfig
            if (createdResources) {
                const resourceCleanup = await this.cleanupCreatedResources(createdResources, 'post-ejecucion');
                totalDeleted += resourceCleanup.deleted;
                totalErrors += resourceCleanup.errors;
            }

            this.log(`=== RESUMEN LIMPIEZA COMPLETA: ${totalDeleted} eliminados, ${totalErrors} errores ===`);

        } catch (error) {
            this.logError(`Error durante limpieza completa: ${error.message}`);
        }
    }
}

module.exports = CleanupService;
