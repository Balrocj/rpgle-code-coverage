'use strict';

const vscode = require('vscode');

/**
 * Responsable de construir y ejecutar el comando CODECOV via estrategias CCSID.
 * Tambien gestiona el log de la ultima ejecucion.
 */
class CodecovRunner {
    /**
     * @param {{
     *   getConnection: () => any,
     *   clProgramService: import('./TemporaryClProgramService'),
     *   cleanupCreatedResources: (resources: object, context: string) => Promise<void>,
     *   log: (msg: string) => void,
     *   logError: (msg: string) => void
     * }} deps
     */
    constructor(deps) {
        this.getConnection = deps.getConnection;
        this.clProgramService = deps.clProgramService;
        this.cleanupCreatedResources = deps.cleanupCreatedResources;
        this.log = deps.log;
        this.logError = deps.logError;

        this.lastExecutionLog = null;
        this.lastExecutionTimestamp = null;
    }

    // -------------------------------------------------------------------------
    // Construccion del comando CODECOV
    // -------------------------------------------------------------------------

    /**
     * Construye la cadena de comando CODECOV (sin CHGJOB).
     */
    buildCommand(moduleInfo, ccView, ccLevel, tempStorage) {
        return `QDEVTOOLS/CODECOV ` +
               `CMD(${moduleInfo.programToExecute}) ` +
               `MODULE(${moduleInfo.modulesToAnalyze}) ` +
               `CCVIEW(${ccView}) ` +
               `CCLVL(${ccLevel}) ` +
               `OUTSTMF('${tempStorage.ccStmf}')`;
    }

    // -------------------------------------------------------------------------
    // Ejecucion de estrategias CCSID
    // -------------------------------------------------------------------------

    /**
     * Ejecutar CODECOV intentando las estrategias CCSID configuradas.
     *
     * @param {{
     *   moduleInfo: object,
     *   moduleSpecForCodecov: string,
     *   ccView: string,
     *   ccLevel: string,
     *   tempStorage: object,
     *   createdResources: { programs: string[], sourceFiles: string[], tempFiles: string[] }
     * }} opts
     * @returns {Promise<{ result: object, successStrategy: string|null }>}
     */
    async run({ moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, createdResources }) {
        const conn = this.getConnection();

        const codecovCmd = this.buildCommand(moduleInfo, ccView, ccLevel, tempStorage);
        this.log('Comando CODECOV: ' + codecovCmd);

        const ccsidStrategies = [
            { name: 'CCSID 37 (US English)', ccsid: '37' }
            //{ name: 'CCSID 284 (Spanish Latin America)', ccsid: '284' },
            //{ name: 'Sin CHGJOB', ccsid: null }
        ];

        let codecovResult = null;
        let successStrategy = null;

        for (const strategy of ccsidStrategies) {
            this.log(`🧪 Probando estrategia: ${strategy.name}`);

            const strategyResources = { programs: [], sourceFiles: [], tempFiles: [] };

            const registerResource = (bucket, value) => {
                if (!value) { return; }
                if (!createdResources[bucket].includes(value)) {
                    createdResources[bucket].push(value);
                }
                if (!strategyResources[bucket].includes(value)) {
                    strategyResources[bucket].push(value);
                }
            };

            try {
                if (strategy.ccsid) {
                    // Crear y compilar programa CL que ejecuta CHGJOB + CODECOV en el mismo trabajo
                    const clResult = await this.clProgramService.createAndCompile({
                        moduleInfo,
                        moduleSpecForCodecov,
                        ccView,
                        ccLevel,
                        tempStorage,
                        ccsid: strategy.ccsid,
                        registerResource
                    });

                    if (clResult) {
                        const callPgmCmd = `CALL PGM(${clResult.programQualified})`;
                        this.log(`🚀 Ejecutando programa CL: ${callPgmCmd}`);

                        codecovResult = await conn.runCommand({
                            command: callPgmCmd,
                            environment: 'ile'
                        });

                        // Errores criticos de stderr → relanzar para que caiga en el catch
                        if (codecovResult && codecovResult.stderr &&
                            (codecovResult.stderr.includes('CPF1992') || // STRDBG not allowed in thread-possible job
                             codecovResult.stderr.includes('CPD0192') || // service program no encontrado
                             codecovResult.stderr.includes('RNQ0211') || // programa no encontrado
                             codecovResult.stderr.includes('CPF955F') || // programa/srvpgm no disponible
                             codecovResult.stderr.includes('MCH3401') || // cannot resolve to object
                             codecovResult.stderr.includes('MCH4431')    // violacion de firma
                            )) {
                            this.log(codecovResult.stderr);
                            throw new Error(codecovResult.stderr);
                        }

                        if (codecovResult && codecovResult.code === 0) {
                            this.log(`✅ Estrategia "${strategy.name}" exitosa usando programa CL en ILEDITOR!`);
                            this.log(`🎯 CCSID ${strategy.ccsid} mantenido persistente en el mismo trabajo`);
                            successStrategy = `${strategy.name} (programa CL ILEDITOR - CCSID persistente)`;
                            break;
                        } else {
                            this.log(`❌ Programa CL ejecutado pero CODECOV fallo: ${codecovResult?.stderr || codecovResult?.message}`);
                        }
                    }
                } else {
                    // Sin CHGJOB: ejecutar CODECOV directamente
                    this.log(`🚀 Ejecutando CODECOV directamente (sin CHGJOB)...`);
                    codecovResult = await conn.runCommand({
                        command: codecovCmd,
                        environment: 'ile'
                    });

                    if (codecovResult && codecovResult.code === 0) {
                        this.log(`✅ CODECOV directo exitoso!`);
                        successStrategy = `${strategy.name} (directo)`;
                        break;
                    }
                }

            } catch (error) {
                this.log(`❌ Excepcion en estrategia "${strategy.name}": ${error.message}`);

                const stderr = (codecovResult && codecovResult.stderr) ? codecovResult.stderr : '';
                const isLibraryError = stderr.includes('CPD0192') ||
                                       stderr.includes('RNQ0211') ||
                                       stderr.includes('CPF955F') ||
                                       stderr.includes('MCH3401') ||
                                       stderr.includes('MCH4431');

                if (isLibraryError) {
                    await vscode.window.showWarningMessage(
                        `Coverage is in progress; however, errors occurred during the process. ` +
                        `This is likely due to missing libraries. Please wait for the report to be generated, then review the library list and try again.`,
                        'See Details'
                    ).then(selection => {
                        if (selection === 'See Details') {
                            const cleanedError = this.cleanErrorMessage(stderr || error.message);
                            vscode.window.showErrorMessage(
                                `Coverage execution log:\n\n${cleanedError}`,
                                { modal: true }
                            );
                        }
                    });
                } else {
                    throw error;
                }

            } finally {
                try {
                    await this.cleanupCreatedResources(strategyResources, `estrategia ${strategy.name}`);
                } catch (cleanupError) {
                    this.log(`⚠️ Error en limpieza de estrategia ${strategy.name}: ${cleanupError.message}`);
                }
            }
        }

        // Calcular resultado final
        if (codecovResult && codecovResult.code === 0) {
            this.log(`🎯 CODECOV ejecutado exitosamente usando: ${successStrategy}`);
            this.log(`📊 Resultado: ${JSON.stringify({
                code: codecovResult.code,
                stdout: codecovResult.stdout ? codecovResult.stdout.substring(0, 200) + '...' : 'Sin stdout',
                stderr: codecovResult.stderr ? codecovResult.stderr.substring(0, 200) + '...' : 'Sin stderr'
            })}`);
        } else {
            this.log('❌ Todas las estrategias fallaron');
            if (!codecovResult) {
                codecovResult = { code: -1, stderr: 'No strategy could be implemented' };
            }
            this.log(`📊 Ultimo resultado: ${JSON.stringify(codecovResult)}`);
        }

        return { result: codecovResult, successStrategy };
    }

    // -------------------------------------------------------------------------
    // Log de ejecucion
    // -------------------------------------------------------------------------

    storeExecutionLog(stderr) {
        this.lastExecutionLog = stderr || '';
        this.lastExecutionTimestamp = new Date().toISOString();
        this.log(`📝 Execution log stored at ${this.lastExecutionTimestamp}`);
    }

    getLastExecutionLog() {
        if (!this.lastExecutionLog) {
            return null;
        }
        return {
            timestamp: this.lastExecutionTimestamp,
            cleanedLog: this.cleanErrorMessage(this.lastExecutionLog),
            hasErrors: this.lastExecutionLog && this.lastExecutionLog.trim().length > 0
        };
    }

    // -------------------------------------------------------------------------
    // Limpieza de mensajes de error
    // -------------------------------------------------------------------------

    /**
     * Filtra mensajes informativos del stderr para mostrar solo errores relevantes.
     */
    cleanErrorMessage(errorMessage) {
        if (!errorMessage || typeof errorMessage !== 'string') {
            return 'No error details available.';
        }

        const codesToRemove = [
            'CPFA0A9',  // Objeto no encontrado EN_US.UTF-8
            'CPC7301',  // Archivo CODECOV creado
            'CPC7305',  // Miembro añadido
            'CPI4339',  // Opciones de consulta QAQQINI
            'CCR0018',  // Modulo instrumentado
            'CCR0005',  // Sesion de cobertura finalizada
            'QSH0005',  // Comando termino satisfactoriamente
            'CPC7309',  // Miembro eliminado
            'CCR0021',  // Archivo de resultados creado
            'CPC2206'   // Propiedad del objeto modificada
        ];

        const filteredLines = errorMessage.split('\n')
            .filter(line => !codesToRemove.some(code => line.includes(code)))
            .filter(line => line.trim().length > 0)
            .map(line => line.trim());

        if (filteredLines.length === 0) {
            return 'Library or dependency error occurred during coverage execution. Please check your library list configuration.';
        }

        return filteredLines.join('\n');
    }
}

module.exports = CodecovRunner;
