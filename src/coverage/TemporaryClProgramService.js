'use strict';

const logger = require('../Logger');

/**
 * Gestiona la creacion, compilacion y ejecucion de programas CL temporales
 * en ILEDITOR para ejecutar CHGJOB + CODECOV en el mismo trabajo.
 */
class TemporaryClProgramService {
    /**
     * @param {{
     *   getConnection: () => any,
     *   log: (msg: string) => void,
     *   logError: (msg: string) => void,
     *   getHomeDirectory: () => string
     * }} deps
     */
    constructor(deps) {
        this.getConnection = deps.getConnection;
        this.log = deps.log;
        this.logError = deps.logError;
        this.getHomeDirectory = deps.getHomeDirectory;
    }

    // -------------------------------------------------------------------------
    // Helpers de verificacion de objetos
    // -------------------------------------------------------------------------

    /**
     * Verificar si un programa o service program existe.
     * @param {string} qualifiedName  Formato "LIB/NOMBRE"
     */
    async checkProgramExists(qualifiedName) {
        try {
            const [library, name] = qualifiedName.includes('/')
                ? qualifiedName.split('/')
                : ['ILEDITOR', qualifiedName];

            const content = this.getConnection().getContent();

            const srvpgmExists = await content.checkObject({ library, name, type: '*SRVPGM' });
            if (srvpgmExists) { return true; }

            const pgmExists = await content.checkObject({ library, name, type: '*PGM' });
            return pgmExists;
        } catch (error) {
            logger.error('Error verificando programa:', error);
            return false;
        }
    }

    /**
     * Verificar si un archivo fuente existe en una biblioteca.
     */
    async checkSourceFileExists(library, srcFile) {
        try {
            const result = await this.getConnection().runCommand({
                command: `DSPFD FILE(${library}/${srcFile})`,
                environment: 'ile'
            });
            return result.code === 0;
        } catch {
            return false;
        }
    }

    /**
     * Verificar si un miembro existe en un archivo fuente.
     */
    async checkMemberExists(library, srcFile, member) {
        try {
            const result = await this.getConnection().runCommand({
                command: `DSPMBRPD FILE(${library}/${srcFile}) MBR(${member})`,
                environment: 'ile'
            });
            return result.code === 0;
        } catch {
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Generacion de nombres unicos
    // -------------------------------------------------------------------------

    /**
     * Generar nombres unicos para programa CL y archivo fuente temporal.
     * @returns {{ programName: string, sourceFileName: string, memberName: string }}
     */
    async generateUniqueNames() {
        const now = new Date();
        const timeId = now.getHours().toString().padStart(2, '0') +
                       now.getMinutes().toString().padStart(2, '0');
        const randomId = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        const userSuffix = timeId.slice(-2) + randomId.slice(-1);

        this.log(`Usando identificador unico basado en tiempo: "${userSuffix}"`);
        this.log(`Componentes: hora=${timeId}, random=${randomId}, suffix=${userSuffix}`);

        const maxAttempts = 10;

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const timestamp = Date.now().toString(36);
            const baseName = `C${userSuffix}${timestamp}`.substring(0, 10);
            const srcFileName = `Q${baseName.substring(1)}`.substring(0, 10);

            const pgmExists = await this.checkProgramExists(`ILEDITOR/${baseName}`);
            const srcFileExists = await this.checkSourceFileExists('ILEDITOR', srcFileName);

            if (!pgmExists && !srcFileExists) {
                this.log(`✅ Nombres unicos generados: programa=${baseName}, srcFile=${srcFileName}`);
                return {
                    programName: baseName,
                    sourceFileName: srcFileName,
                    memberName: baseName
                };
            }

            this.log(`⚠️ Nombres ${baseName}/${srcFileName} ya existen, reintentando...`);
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        throw new Error(`No se pudo generar nombres unicos despues de ${maxAttempts} intentos`);
    }

    // -------------------------------------------------------------------------
    // Generacion de codigo CL
    // -------------------------------------------------------------------------

    /**
     * Generar contenido del programa CL que ejecuta CHGJOB + CODECOV en el mismo trabajo,
     * dividiendo el parametro MODULE en multiples lineas si es necesario.
     */
    generateCLCode(moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, ccsid) {
        this.log(`CMD: ${moduleInfo.programToExecute}`);
        this.log(`MODULE: ${moduleInfo.module}`);
        this.log(`OUTSTMF: ${moduleInfo.outStmf}`);
        this.log(`CCVIEW: ${ccView}`);
        this.log(`CCLEVEL: ${ccLevel}`);
        this.log(`OUTSTMF: ${tempStorage.outStmf}`);

        const maxLineLength = 60;
        let moduleLines = '';

        if (moduleInfo.modulesToAnalyze.length > maxLineLength) {
            const modules = moduleInfo.modulesToAnalyze.split(/\s+/).filter(m => m.trim() !== '');
            this.log(`📋 Dividiendo ${modules.length} modulos en multiples lineas CL`);

            let currentLine = '';
            for (let i = 0; i < modules.length; i++) {
                const module = modules[i];
                if (i === 0) {
                    currentLine = module;
                    moduleLines = `MODULE(${currentLine}`;
                } else if ((currentLine + ' ' + module).length > maxLineLength) {
                    moduleLines += ` +\n                           ${module}`;
                    currentLine = module;
                } else {
                    moduleLines += ` ${module}`;
                    currentLine += ` ${module}`;
                }
            }
            moduleLines += `)`;
            this.log(`✅ Parametro MODULE dividido en multiples lineas`);
        } else {
            moduleLines = `MODULE(${moduleInfo.modulesToAnalyze})`;
        }

        return `             PGM
             DCL        VAR(&MSGID) TYPE(*CHAR) LEN(7)
             DCL        VAR(&MSGDTA) TYPE(*CHAR) LEN(100)
             
             /* Cambiar CCSID del trabajo */
             CHGJOB     CCSID(${ccsid})
             MONMSG     MSGID(CPF0000) EXEC(DO)
                RCVMSG     MSGTYPE(*LAST) MSGDTA(&MSGDTA) MSGID(&MSGID)
                SNDPGMMSG  MSGID(CPF9898) MSGF(QCPFMSG) +
                           MSGDTA('Error CHGJOB:' *BCAT &MSGID *BCAT '-' +
                           *BCAT &MSGDTA)
                RETURN
             ENDDO
             
             /* Ejecutar CODECOV dividido en lineas */
             QDEVTOOLS/CODECOV +
                CMD(${moduleInfo.programToExecute}) +
                ${moduleLines} +
                CCVIEW(${ccView}) +
                CCLVL(${ccLevel}) +
                OUTSTMF('${tempStorage.ccStmf}')
             MONMSG     MSGID(CPF0000) EXEC(DO)
                RCVMSG     MSGTYPE(*LAST) MSGDTA(&MSGDTA) MSGID(&MSGID)
                SNDPGMMSG  MSGID(CPF9898) MSGF(QCPFMSG) +
                           MSGDTA('Error CODECOV:' *BCAT &MSGID *BCAT '-' +
                           *BCAT &MSGDTA)
                RETURN
             ENDDO
             
             ENDPGM`;
    }

    // -------------------------------------------------------------------------
    // Flujo completo: crear, escribir e compilar programa CL
    // -------------------------------------------------------------------------

    /**
     * Crea el archivo fuente, el miembro y compila el programa CL en ILEDITOR.
     * Retorna uniqueNames para registro de recursos, o null si fallo la compilacion.
     *
     * @param {object} opts
     * @param {object} opts.moduleInfo
     * @param {object} opts.moduleSpecForCodecov
     * @param {string} opts.ccView
     * @param {string} opts.ccLevel
     * @param {object} opts.tempStorage
     * @param {number} opts.ccsid
     * @param {(bucket: string, value: string) => void} opts.registerResource
     * @returns {{ uniqueNames: object, programQualified: string } | null}
     */
    async createAndCompile({ moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, ccsid, registerResource }) {
        const conn = this.getConnection();

        this.log(`🚀 Creando programa CL en ILEDITOR para mantener CCSID persistente...`);

        const uniqueNames = await this.generateUniqueNames();
        this.log(`📝 Nombres unicos generados: ${JSON.stringify(uniqueNames)}`);

        registerResource('programs', `ILEDITOR/${uniqueNames.programName}`);
        registerResource('sourceFiles', `ILEDITOR/${uniqueNames.sourceFileName}`);

        const clContent = this.generateCLCode(moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, ccsid);

        // Crear archivo fuente
        this.log(`📄 Creando archivo fuente unico: ILEDITOR/${uniqueNames.sourceFileName}`);
        const createSrcResult = await conn.runCommand({
            command: `CRTSRCPF FILE(ILEDITOR/${uniqueNames.sourceFileName}) RCDLEN(112) TEXT('Temp CL source for CodeCov')`,
            environment: 'ile'
        });
        if (createSrcResult.code !== 0) {
            throw new Error(`Error creando archivo fuente: ${createSrcResult.stderr}`);
        }

        // Agregar miembro
        const addMbrResult = await conn.runCommand({
            command: `ADDPFM FILE(ILEDITOR/${uniqueNames.sourceFileName}) MBR(${uniqueNames.memberName}) TEXT('Temp CL member for CodeCov CCSID') SRCTYPE(CLLE)`,
            environment: 'ile'
        });
        if (addMbrResult.code !== 0) {
            throw new Error(`Error creando miembro: ${addMbrResult.stderr}`);
        }

        // Escribir CL via archivo temporal en IFS
        this.log(`📝 Escribiendo codigo CL al miembro...`);
        const homeDir = this.getHomeDirectory();
        const tempClPath = `${homeDir}/${uniqueNames.memberName}_${Date.now()}.cl`;
        registerResource('tempFiles', tempClPath);

        const content = conn.getContent();
        await content.writeStreamfile(tempClPath, clContent);
        this.log(`📝 Archivo temporal CL creado: ${tempClPath}`);

        const copyResult = await conn.runCommand({
            command: `CPYFRMSTMF FROMSTMF('${tempClPath}') TOMBR('/QSYS.LIB/ILEDITOR.LIB/${uniqueNames.sourceFileName}.FILE/${uniqueNames.memberName}.MBR') MBROPT(*REPLACE)`,
            environment: 'ile'
        });
        if (copyResult.code !== 0) {
            throw new Error(`Error copiando a miembro: ${copyResult.stderr}`);
        }

        // Limpiar IFS inmediatamente tras copia
        try {
            await conn.runCommand({ command: `rm '${tempClPath}'`, environment: 'pase' });
            this.log(`🧹 Archivo temporal IFS eliminado`);
        } catch (rmError) {
            this.log(`⚠️ Warning: No se pudo eliminar archivo temporal IFS: ${rmError.message}`);
        }

        this.log(`✅ Codigo CL escrito exitosamente al miembro`);

        // Compilar programa CL
        const compileResult = await conn.runCommand({
            command: `CRTCLPGM PGM(ILEDITOR/${uniqueNames.programName}) SRCFILE(ILEDITOR/${uniqueNames.sourceFileName}) SRCMBR(${uniqueNames.memberName})`,
            environment: 'ile'
        });

        if (compileResult.code !== 0) {
            this.log(`❌ Error compilando programa CL: ${compileResult.stderr || compileResult.message}`);
            return null;
        }

        this.log(`✅ Programa CL compilado exitosamente: ILEDITOR/${uniqueNames.programName}`);
        return { uniqueNames, programQualified: `ILEDITOR/${uniqueNames.programName}` };
    }
}

module.exports = TemporaryClProgramService;
