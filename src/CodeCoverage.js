const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const xml2js = require('xml2js');
const tmp = require('tmp');
const logger = require('./Logger');
const cleanupServiceClass = require('./coverage/CleanupService');
const temporaryClProgramServiceClass = require('./coverage/TemporaryClProgramService');
const codecovRunnerClass = require('./coverage/CodecovRunner');

/**
 * Leer configuración desde ConfigCoverage.json
 */
function readTestingConfig() {
    try {
        // Obtener la ruta de la extensión
        const extensionPath = vscode.extensions.getExtension('balrocj.rpgle-code-coverage')?.extensionPath || 
                             path.join(__dirname, '..');
        
        const configPath = path.join(extensionPath, 'ConfigCoverage.json');
        
        logger.debug('Buscando ConfigCoverage.json en:', configPath);
        
        if (fs.existsSync(configPath)) {
            logger.debug('Encontrado ConfigCoverage.json en:', configPath);
            const content = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(content);
        }
        
        logger.debug('No se encontró ConfigCoverage.json en:', configPath);
        return null;
    } catch (error) {
        logger.error('Error leyendo ConfigCoverage.json:', error);
        return null;
    }
}

/**
 * Clase para manejo real de cobertura usando CODECOV de IBM i
 * Implementación especializada para generación de reportes de cobertura
 */
class RealCoverageExecutor {
    constructor() {
        this.connection = null;
        this.tempFiles = [];
        this.outputChannel = null;
        this.lastExecutionLog = null; // Almacenar el stderr de la última ejecución
        this.lastExecutionTimestamp = null; // Timestamp de la última ejecución
        this.cleanupService = new cleanupServiceClass({
            getConnection: () => this.connection,
            log: (message) => this.log(message),
            logError: (message) => this.logError(message),
            getHomeDirectory: () => this.getHomeDirectory()
        });
        this.clProgramService = new temporaryClProgramServiceClass({
            getConnection: () => this.connection,
            log: (message) => this.log(message),
            logError: (message) => this.logError(message),
            getHomeDirectory: () => this.getHomeDirectory()
        });
        this.codecovRunner = new codecovRunnerClass({
            getConnection: () => this.connection,
            clProgramService: this.clProgramService,
            cleanupCreatedResources: (res, ctx) => this.cleanupCreatedResources(res, ctx),
            log: (message) => this.log(message),
            logError: (message) => this.logError(message)
        });
    }

    /**
     * Configurar canal de output para debug
     */
    setOutputChannel(outputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Log con canal de output
     */
    log(message) {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
        }
        logger.debug(message);
    }

    /**
     * Log de error con canal de output  
     */
    logError(message) {
        if (this.outputChannel) {
            this.outputChannel.appendLine('ERROR: ' + message);
        }
        logger.error(message);
    }

    /**
     * Inicializar conexión con IBM i (requiere Code for IBM i)
     */
    async initialize() {
        try {
            this.log('=== INICIO INICIALIZACIÓN ===');
            
            // Obtener la API de Code for IBM i
            this.log('Buscando extensión Code for IBM i...');
            const codeForIBMiExtension = vscode.extensions.getExtension('halcyontechltd.code-for-ibmi');
            if (!codeForIBMiExtension) {
                this.logError('Code for IBM i extension is not installed');
                throw new Error('Code for IBM i extension is not installed');
            }
            this.log('Extensión Code for IBM i encontrada');

            this.log('Verificando si la extensión está activa...');
            if (!codeForIBMiExtension.isActive) {
                this.log('Activando extensión Code for IBM i...');
                await codeForIBMiExtension.activate();
                this.log('Extensión activada');
            } else {
                this.log('Extensión ya estaba activa');
            }

            this.log('Obteniendo instance de la extensión...');
            const { instance } = codeForIBMiExtension.exports;
            if (!instance) {
                this.logError('Could not get Code for IBM i instance');
                throw new Error('Could not get Code for IBM i instance');
            }
            this.log('Instance obtenida exitosamente');
            
            this.log('Obteniendo conexión...');
            this.connection = instance.getConnection();
            
            if (!this.connection) {
                this.logError('No active connection to IBM i - please ensure you are connected in Code for IBM i');
                throw new Error('No active connection to IBM i');
            }
            
            this.log('Conexión obtenida exitosamente');
            this.log('=== INICIALIZACIÓN COMPLETADA ===');
            return true;
        } catch (error) {
            logger.error('Error inicializando conexión:', error);
            return false;
        }
    }

    /**
     * Verificar que CODECOV esté disponible
     */
    async checkCodeCovAvailable() {
        if (!this.connection) {
            return false;
        }

        try {
            const content = this.connection.getContent();
            const commandExists = await content.checkObject({ 
                library: 'QDEVTOOLS', 
                name: 'CODECOV', 
                type: '*CMD' 
            });
            return commandExists;
        } catch (error) {
            logger.error('Error verificando CODECOV:', error);
            return false;
        }
    }

    /**
     * Ejecutar cobertura real en un archivo RPGLE o módulo
     */
    async executeCoverage(input, testProgram = null) {
        this.log('=== INICIO executeCoverage ===');
        this.log('input: ' + JSON.stringify(input));
        this.log('testProgram: ' + testProgram);
        
        if (!this.connection) {
            this.logError('No hay conexión con IBM i');
            throw new Error('There is no connection to IBM i');
        }

        try {
            // Procesar archivos desde el archivo de configuración JSON
               if (typeof input === 'object' && input.type) {
        //     if (input && input.trim() !== '') {
                // Objeto con información de módulo (configuración JSON)
                this.log('Modo objeto - ejecutando cobertura para configuración JSON...');
                return await this.executeCoverageForConfig(input);
            } else {
                throw new Error('Invalid input format. String or object with type expected.');
            }
        } catch (error) {
            this.logError('Error running coverage: ' + error.message);
            this.logError('Stack trace: ' + error.stack);
          //  vscode.window.showErrorMessage(`Error running coverage: ${error.message}`);
            throw new Error(error.message);            
        }
    }

    /**
     * Parsear URI de miembro: member:/LIBRARY/SRCFILE/MEMBER.EXT
     */
    parseMemberUri(memberUri) {
        this.log('=== INICIO parseMemberUri ===');
        this.log('memberUri original: ' + memberUri);
        
        try {
            // Usar URL constructor para manejar correctamente la URI
            let cleanUri = memberUri;
            
            // Si la URI contiene parámetros URL encoded, necesitamos decodificarla
            if (cleanUri.includes('%')) {
                cleanUri = decodeURIComponent(cleanUri);
                this.log('URI decodificada: ' + cleanUri);
            }
            
            // Remover el prefijo member: y parsear la ruta
            let path = cleanUri.replace('member:', '');
            
            // Remover parámetros de query si existen - buscar ? en toda la cadena
            const queryIndex = path.indexOf('?');
            if (queryIndex !== -1) {
                path = path.substring(0, queryIndex);
                this.log('Path después de remover query params en posición ' + queryIndex + ': ' + path);
            }
            
            // También limpiar si hay parámetros que quedaron sin decodificar
            if (path.includes('%')) {
                // Buscar el último punto antes de cualquier %
                const percentIndex = path.indexOf('%');
                const lastDotBeforePercent = path.lastIndexOf('.', percentIndex);
                if (lastDotBeforePercent !== -1) {
                    path = path.substring(0, lastDotBeforePercent);
                    this.log('Path después de limpiar restos encoded: ' + path);
                }
            }
            
            this.log('Path después de limpiar: ' + path);
            
            // Limpiar barras extra al principio
            if (path.startsWith('/')) {
                path = path.substring(1);
            }
            
            const parts = path.split('/').filter(p => p);
            this.log('Parts: ' + JSON.stringify(parts));
            
            if (parts.length < 3) {
                throw new Error(`Invalid member URI - insufficient parts: ${memberUri}, parts: ${JSON.stringify(parts)}`);
            }
            
            const library = parts[0];
            const srcFile = parts[1];
            const memberWithExt = parts[2];
            
            // MANTENER la extensión para consistencia con convertToMemberUri()
            const member = memberWithExt; // No remover extensión
            const memberName = memberWithExt.split('.')[0]; // Solo el nombre sin extensión para comandos IBM i
        
            const result = {
                library,
                srcFile,
                member, // Con extensión para URIs
                memberName, // Sin extensión para comandos
                fullPath: path
            };
            
            this.log('Member info parsed: ' + JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            this.logError('Error parseando memberUri: ' + error.message);
            this.logError('memberUri original: ' + memberUri);
            throw error;
        }
    }

    /**
     * Verificar si el programa/service program existe
     */
    async checkProgramExists(memberInfo) {
        return this.clProgramService.checkProgramExists(memberInfo);
    }

    /**
     * Generar nombres únicos para programa CL y archivo fuente temporal
     */
    async generateUniqueNames() {
        return this.clProgramService.generateUniqueNames();
    }

    /**
     * Verificar si un archivo fuente existe
     */
    async checkSourceFileExists(library, srcFile) {
        return this.clProgramService.checkSourceFileExists(library, srcFile);
    }

    /**
     * Verificar si un miembro existe en un archivo fuente
     */
    async checkMemberExists(library, srcFile, member) {
        return this.clProgramService.checkMemberExists(library, srcFile, member);
    }

    /**
     * Generar código CL que maneje comandos largos dividiendo en múltiples líneas
     */
    generateCLCodeForLongCommand(moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, ccsid) {
        return this.clProgramService.generateCLCode(moduleInfo, moduleSpecForCodecov, ccView, ccLevel, tempStorage, ccsid);
    }
   

    /**
     * Obtener nombre de sistema desde ruta de archivo
     */
    getSystemName(filePath) { 
        if (filePath.startsWith('member:')) {
            // Para miembros, extraer el nombre del miembro
            const memberInfo = this.parseMemberUri(filePath);
            return memberInfo.memberName.toUpperCase().substring(0, 10);
        } else {
            // Para archivos locales
            const basename = path.basename(filePath, path.extname(filePath));
            return basename.toUpperCase().substring(0, 10);
        }
    }


    /**
     * Obtener directorio home del usuario
     */
    getHomeDirectory() {
        let baseDir = '/tmp'; // Fallback por defecto
        
        try {
            if (this.connection) {
                const config = this.connection.getConfig();
                this.log(`Config disponible: ${JSON.stringify({
                    homeDirectory: config?.homeDirectory,
                    userDirectories: config?.userDirectories,
                    user: config?.username
                }, null, 2)}`);
                
                if (config && config.homeDirectory) {
                    baseDir = config.homeDirectory;
                    this.log(`Usando directorio home del usuario: ${baseDir}`);
                } else {
                    // Intentar obtener desde userDirectories si homeDirectory no está disponible
                    if (config && config.userDirectories && config.userDirectories.length > 0) {
                        baseDir = config.userDirectories[0];
                        this.log(`Usando primer directorio de usuario: ${baseDir}`);
                    } else {
                        this.log(`Warning: No se pudo obtener directorio home, usando fallback: ${baseDir}`);
                    }
                }
            } else {
                this.log(`Warning: No hay conexión, usando directorio fallback: ${baseDir}`);
            }
        } catch (error) {
            this.log(`Error obteniendo directorio home: ${error.message}, usando fallback: ${baseDir}`);
        }
        
        return baseDir;
    }

    getAvailableCoverageDirectory() {
        const configuredDirectory = vscode.workspace
            .getConfiguration('rpgleCoverage')
            .get('availableCoverageDirectory', '');

        if (typeof configuredDirectory !== 'string' || !configuredDirectory.trim()) {
            return this.getHomeDirectory();
        }

        const directory = configuredDirectory.trim().replace(/\/+$/, '');
        return directory || '/';
    }

    setupTempStorage(systemName) {
        const timestamp = Date.now();
        
        // Obtener directorio home del usuario logueado dinámicamente
        const baseDir = this.getHomeDirectory();
        
        return {
            xmlStmf: `${baseDir}/${systemName}_${timestamp}.xml`,
            ccStmf: `${baseDir}/${systemName}_${timestamp}.cczip`
        };
    }

    /**
     * Limpiar archivos temporales del IBM i
     */
    async cleanupTempFiles(tempStorage) {
        return this.cleanupService.cleanupTempFiles(tempStorage);
    }

    /**
     * Función robusta para eliminar archivos que intenta varios métodos
     * Retorna: 'deleted', 'not_found', 'error'
     */
    async deleteFileRobust(filePath, fileType = 'archivo') {
        return this.cleanupService.deleteFileRobust(filePath, fileType);
    }

    /**
     * Forzar limpieza de archivos de cobertura temporales en el directorio home
     * Busca archivos .cczip y .xml con patrones de timestamp
     */
    async forceCleanupCoverageFiles() {
        return this.cleanupService.forceCleanupCoverageFiles();
    }

    /**
     * Limpiar recursos temporales creados en ILEDITOR e IFS.
     * Aplica deduplicacion y reintentos para reducir basura en casos de error.
     */
    async cleanupCreatedResources(createdResources, context = '') {
        return this.cleanupService.cleanupCreatedResources(createdResources, context);
    }

    /**
     * Limpiar todos los archivos temporales creados en executeCoverageForConfig
     * Incluye archivos temporales IFS, programas CL en ILEDITOR y archivos fuente
     */
    async cleanupAllTempFilesInConfig(tempStorage, createdResources = null) {
        return this.cleanupService.cleanupAllTempFilesInConfig(tempStorage, createdResources);
    }

    /**
     * Listar archivos .cczip disponibles en el directorio home del usuario
     */
    async listAvailableCoverageFiles() {
        this.log('=== INICIO listAvailableCoverageFiles ===');
        
        if (!this.connection) {
            throw new Error('No connection available');
        }

        try {
            const coverageDirectory = this.getAvailableCoverageDirectory();
            this.log(`Buscando archivos .cczip en: ${coverageDirectory}`);
            
            const content = this.connection.getContent();
            
            // Obtener lista de archivos en el directorio home
            const fileList = await content.getFileList(coverageDirectory);
            this.log(`Archivos encontrados en ${coverageDirectory}: ${fileList.length}`);
            
            // Log de todos los archivos encontrados para debug
            fileList.forEach((file, index) => {
                this.log(`[${index}] Archivo completo: ${JSON.stringify(file, null, 2)}`);
            });
            
            // Filtrar solo archivos .cczip
            const ccZipFiles = fileList
                .filter(file => {
                    const isFile = file.type === 'file' || file.type === 'streamfile' || !file.type; // IBM i usa 'streamfile' para archivos IFS
                    const isCczip = file.name && file.name.toLowerCase().endsWith('.cczip');
                    this.log(`Filtro - Archivo: ${file.name}, tipo: ${file.type || 'undefined'}, es archivo: ${isFile}, es cczip: ${isCczip}, pasa filtro: ${isFile && isCczip}`);
                    return isFile && isCczip;
                })
                .map(file => ({
                    name: file.name,
                    path: `${coverageDirectory === '/' ? '' : coverageDirectory}/${file.name}`,
                    size: file.size || 0,
                    modified: file.modified || new Date().toISOString()
                }))
                .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()); // Más recientes primero
            
            this.log(`Encontrados ${ccZipFiles.length} archivos .cczip`);
            ccZipFiles.forEach(file => {
                this.log(`  - ${file.name} (${file.size} bytes, ${file.modified})`);
            });
            
            return ccZipFiles;
            
        } catch (error) {
            this.logError(`Error listando archivos de cobertura: ${error.message}`);
            throw error;
        }
    }

    /**
     * Procesar un archivo .cczip específico del directorio home
     */
    async processCoverageFileFromHome(ccZipFileName, targetFilePath = null) {
        this.log('=== INICIO processCoverageFileFromHome ===');
        this.log(`Archivo a procesar: ${ccZipFileName}`);
        this.log(`Archivo objetivo: ${targetFilePath || 'Detectar automáticamente'}`);
        
        if (!this.connection) {
            throw new Error('No connection available');
        }

        try {
            const coverageDirectory = this.getAvailableCoverageDirectory();
            const fullZipPath = ccZipFileName.startsWith('/')
                ? ccZipFileName
                : `${coverageDirectory === '/' ? '' : coverageDirectory}/${ccZipFileName}`;
            this.log(`Preparando para procesar archivo: ${fullZipPath}`);  
            
            // El archivo existe porque ya lo listamos, no es necesario verificar nuevamente
           // const content = this.connection.getContent();
            
            // Si no se especifica archivo objetivo, intentar detectarlo desde el nombre del .cczip
            let originalFilePath = targetFilePath;
            if (!originalFilePath) {
                // Intentar extraer información del nombre del archivo
                // Formato típico: MEMBERX_timestamp.cczip o similar
             //   const baseName = ccZipFileName.replace('.cczip', '').replace(/_\d+$/, '');
                  const baseName = '';
                  this.log(`Nombre base extraído: ${baseName}`);
                
                // Intentar detectar el archivo fuente desde el contenido del ZIP
                originalFilePath = await this.detectSourceFileFromZip(fullZipPath, baseName);
                this.log(`Archivo objetivo detectado: ${originalFilePath}`);
                
            }
            
            // Procesar el archivo usando la función existente
            const coverageDataArray = await this.processCoverageResults(fullZipPath, originalFilePath);
            
            this.log(`Archivo de cobertura procesado exitosamente: ${coverageDataArray.length} archivos encontrados`);
            return coverageDataArray; // Retornar todos los archivos para .cczip
            
        } catch (error) {
            this.logError(`Error procesando archivo de cobertura: ${error.message}`);
            throw error;
        }
    }

    /**
     * Procesar un archivo .cczip local desde el sistema de archivos
     */
    async processLocalCoverageFile(localFilePath, targetFilePath = null) {
        this.log('=== INICIO processLocalCoverageFile ===');
        this.log(`Archivo local a procesar: ${localFilePath}`);
        this.log(`Archivo objetivo: ${targetFilePath || 'Detectar automáticamente'}`);
        
        if (!this.connection) {
            throw new Error('No connection available');
        }

        try {
            // Verificar que el archivo local existe
            if (!fs.existsSync(localFilePath)) {
                throw new Error(`Local file does not exist: ${localFilePath}`);
            }
            
            // Si no se especifica archivo objetivo, intentar detectarlo desde el contenido del ZIP
            let originalFilePath = targetFilePath;
            if (!originalFilePath) {
                const baseName = path.basename(localFilePath, '.cczip');
                this.log(`Nombre base extraído: ${baseName}`);
                
                // Intentar detectar el archivo fuente desde el contenido del ZIP local
                originalFilePath = await this.detectSourceFileFromLocalZip(localFilePath, baseName);
                this.log(`Archivo objetivo detectado: ${originalFilePath}`);
            }
            
            // Procesar el archivo local usando una función adaptada
            const coverageDataArray = await this.processLocalCoverageResults(localFilePath, originalFilePath);
            
            this.log(`Archivo local de cobertura procesado exitosamente: ${coverageDataArray.length} archivos encontrados`);
            return coverageDataArray; // Retornar todos los archivos para .cczip
            
        } catch (error) {
            this.logError(`Error procesando archivo local de cobertura: ${error.message}`);
            throw error;
        }
    }

    /**
     * Detectar archivo fuente desde el contenido del ZIP de cobertura local
     */
    async detectSourceFileFromLocalZip(localZipPath, baseName) {
        try {
            this.log(`=== DETECTANDO ARCHIVO FUENTE DESDE ZIP LOCAL ===`);
            this.log(`ZIP local: ${localZipPath}`);
            this.log(`Base name: ${baseName}`);
            
            // Extraer temporalmente el ZIP local para leer el XML
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            this.log(`Directorio temporal: ${tmpDir.name}`);
            
            this.log(`Extrayendo ZIP local...`);
            const directory = await unzipper.Open.file(localZipPath);
            await directory.extract({ path: tmpDir.name });
            this.log(`ZIP local extraído`);
            
            // Listar contenido del directorio extraído
            const files = fs.readdirSync(tmpDir.name);
            this.log(`Archivos extraídos: ${JSON.stringify(files)}`);
            
            // Leer archivo ccdata XML
            const ccdataPath = path.join(tmpDir.name, 'ccdata');
            this.log(`Buscando ccdata en: ${ccdataPath}`);
            
            if (!fs.existsSync(ccdataPath)) {
                this.log('ERROR: No ccdata file found in the local coverage ZIP.');
                tmpDir.removeCallback();
                throw new Error('No ccdata file found in the local coverage ZIP.');
            }
            
            this.log(`Leyendo ccdata local...`);
            const ccdataContent = fs.readFileSync(ccdataPath);
            this.log(`ccdata local leído, tamaño: ${ccdataContent.length} bytes`);
            
            this.log(`Parseando XML local...`);
            const xml = await xml2js.parseStringPromise(ccdataContent);
            this.log(`Estructura XML local: ${JSON.stringify(Object.keys(xml), null, 2)}`);
            
            // Variable para almacenar el archivo fuente detectado
            let sourceFilePath = ``; 
            
            // Buscar en la estructura LLC de CODECOV (más común)
            if (xml.LLC && xml.LLC.lineLevelCoverageClass) {
                const coverageClasses = xml.LLC.lineLevelCoverageClass;
                this.log(`Encontradas ${coverageClasses.length} clases de cobertura en ZIP local`);
                
                if (coverageClasses.length > 0) {
                    const firstClass = coverageClasses[0];
                    this.log(`Datos de la primera clase local: ${JSON.stringify(firstClass.$, null, 2)}`);
                    
                    if (firstClass.$ && firstClass.$.sourceFile) {
                        const sourceName = firstClass.$.sourceFile;
                        this.log(`Archivo fuente encontrado en XML LLC local: ${sourceName}`);
                        
                        // El sourceFile en LLC ya contiene la extensión correcta
                        sourceFilePath = sourceName;
                    }
                }
            }
            // Fallback para XML con estructura ccdata/sources
            else if (xml.ccdata && xml.ccdata.sources && xml.ccdata.sources[0] && xml.ccdata.sources[0].source) {
                const sources = xml.ccdata.sources[0].source;
                this.log(`Fuentes encontradas en ccdata local: ${sources.length}`);
                
                if (sources.length > 0) {
                    const sourceInfo = sources[0];
                    this.log(`Información de fuente local: ${JSON.stringify(sourceInfo, null, 2)}`);
                    
                    if (sourceInfo.$ && sourceInfo.$.name) {
                        const sourceName = sourceInfo.$.name;
                        this.log(`Nombre de archivo fuente en XML ccdata local: ${sourceName}`);
                        sourceFilePath = sourceName;
                    }
                }
            } else {
                this.log(`No se encontró estructura XML conocida en ZIP local (ni LLC ni ccdata)`);
            }
            
            // Convertir ruta de IBM i a URI member: si es necesario
            const memberUri = this.convertToMemberUri(sourceFilePath);
            
            // Limpiar archivos temporales
            tmpDir.removeCallback();
            
            this.log(`=== RESULTADO FINAL LOCAL: ${memberUri} ===`);
            return memberUri;
            
        } catch (error) {
            this.log(`ERROR en detectSourceFileFromLocalZip: ${error.message}`);
            this.log(`Stack trace: ${error.stack}`);
            throw new Error(`Error detecting source file from local ZIP: ${error.message}`);
        }
    }

    /**
     * Procesar archivo ZIP local de resultados de cobertura
     */
    async processLocalCoverageResults(localZipPath, originalFilePath) {
        try {
            this.log('INICIO processLocalCoverageResults');
            this.log('localZipPath: ' + localZipPath);
            this.log('originalFilePath: ' + originalFilePath);
            
            // 1. Extraer contenido del archivo ZIP local
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            this.log('tmpDir: ' + tmpDir.name);
            
            this.log('Extrayendo ZIP local...');
            const directory = await unzipper.Open.file(localZipPath);
            await directory.extract({ path: tmpDir.name });
            this.log('ZIP local extraído exitosamente');
            
            // 2. Leer archivo XML de cobertura
            const ccdataPath = path.join(tmpDir.name, 'ccdata');
            this.log('Leyendo archivo ccdata local desde: ' + ccdataPath);
            const ccdataContent = fs.readFileSync(ccdataPath);
            this.log('ccdata local leído, tamaño: ' + ccdataContent.length + ' bytes');
            
            this.log('Parseando XML local...');
            const xml = await xml2js.parseStringPromise(ccdataContent);
            this.log('XML local parseado exitosamente');
            
            // 3. Parsear datos XML
            this.log('Llamando a parseXmlCoverage con datos locales...');
            const coverageDataArray = await this.parseXmlCoverage(xml, tmpDir.name, originalFilePath);
            
            // 4. Limpiar archivos temporales
            tmpDir.removeCallback();
            
            this.log(`Retornando ${coverageDataArray.length} archivos de cobertura local`);
            return coverageDataArray;
        } catch (error) {
            logger.error('Error procesando resultados locales:', error);
            throw error;
        }
    }

    /**
     * Detectar archivo fuente desde el contenido del ZIP de cobertura
     */
    async detectSourceFileFromZip(zipPath, baseName) {
        try {
            this.log(`=== DETECTANDO ARCHIVO FUENTE ===`);
            this.log(`ZIP: ${zipPath}`);
            this.log(`Base name: ${baseName}`);
            
            // Descargar y extraer temporalmente el ZIP para leer el XML
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const tmpFile = tmp.fileSync();
            this.log(`Directorio temporal: ${tmpDir.name}`);
            this.log(`Archivo temporal: ${tmpFile.name}`);
            
            const content = this.connection.getContent();
            this.log(`Descargando ZIP...`);
            await content.downloadStreamfileRaw(zipPath, tmpFile.name);
            this.log(`ZIP descargado`);
            
            this.log(`Extrayendo ZIP...`);
            const directory = await unzipper.Open.file(tmpFile.name);
            await directory.extract({ path: tmpDir.name });
            this.log(`ZIP extraído`);
            
            // Listar contenido del directorio extraído
            const files = fs.readdirSync(tmpDir.name);
            this.log(`Archivos extraídos: ${JSON.stringify(files)}`);
            
            // Leer archivo ccdata XML
            const ccdataPath = path.join(tmpDir.name, 'ccdata');
            this.log(`Buscando ccdata en: ${ccdataPath}`);
            
            if (!fs.existsSync(ccdataPath)) {
                this.log('ERROR: No ccdata file found in the coverage ZIP.');
                tmpDir.removeCallback();
                tmpFile.removeCallback();
                throw new Error('No ccdata file found in the coverage ZIP.');
            }
            
            this.log(`Leyendo ccdata...`);
            const ccdataContent = fs.readFileSync(ccdataPath);
            const ccdataContent2 = fs.readFileSync(ccdataPath, 'utf-8');
            this.log(`ccdata leído, tamaño: ${ccdataContent.length} bytes`);
            
            this.log(`Parseando XML...`);
            const xml = await xml2js.parseStringPromise(ccdataContent);
            this.log(`Estructura XML: ${JSON.stringify(Object.keys(xml), null, 2)}`);
            
            // Variable para almacenar el archivo fuente detectado
            let sourceFilePath = ``; 
            
            // Buscar en la estructura LLC de CODECOV (más común)
            if (xml.LLC && xml.LLC.lineLevelCoverageClass) {
                const coverageClasses = xml.LLC.lineLevelCoverageClass;
                this.log(`Encontradas ${coverageClasses.length} clases de cobertura`);
                
                if (coverageClasses.length > 0) {
                    const firstClass = coverageClasses[0];
                    this.log(`Datos de la primera clase: ${JSON.stringify(firstClass.$, null, 2)}`);
                    
                    if (firstClass.$ && firstClass.$.sourceFile) {
                        const sourceName = firstClass.$.sourceFile;
                        this.log(`Archivo fuente encontrado en XML LLC: ${sourceName}`);
                        
                        // El sourceFile en LLC ya contiene la extensión correcta
                        sourceFilePath = sourceName;
                    }
                }
            }
            // Fallback para XML con estructura ccdata/sources
            else if (xml.ccdata && xml.ccdata.sources && xml.ccdata.sources[0] && xml.ccdata.sources[0].source) {
                const sources = xml.ccdata.sources[0].source;
                this.log(`Fuentes encontradas en ccdata: ${sources.length}`);
                
                if (sources.length > 0) {
                    const sourceInfo = sources[0];
                    this.log(`Información de fuente: ${JSON.stringify(sourceInfo, null, 2)}`);
                    
                    if (sourceInfo.$ && sourceInfo.$.name) {
                        const sourceName = sourceInfo.$.name;
                        this.log(`Nombre de archivo fuente en XML ccdata: ${sourceName}`);
                        sourceFilePath = sourceName;
                    }
                }
            } else {
                this.log(`No se encontró estructura XML conocida (ni LLC ni ccdata)`);
            }
            
            // Convertir ruta de IBM i a URI member: si es necesario
            const memberUri = this.convertToMemberUri(sourceFilePath);
            
            // Limpiar archivos temporales
            tmpDir.removeCallback();
            tmpFile.removeCallback();
            
            this.log(`=== RESULTADO FINAL: ${memberUri} ===`);
            return memberUri;
            
        } catch (error) {
            this.log(`ERROR en detectSourceFileFromZip: ${error.message}`);
            this.log(`Stack trace: ${error.stack}`);
        //  vscode.window.showErrorMessage(`Error detecting source file: ${error.message}`);
            throw new Error(`Error detecting source file from ZIP: ${error.message}`);
        }
    }

    /**
     * Convertir ruta de IBM i a URI member: estándar
     */
    convertToMemberUri(sourceFilePath) {
        try {
            this.log(`Convirtiendo ruta: ${sourceFilePath}`);
            
            // Validar y corregir caracteres mal codificados (# o $ por Ñ)
            if (sourceFilePath.includes('#') || sourceFilePath.includes('$')) {
                const originalPath = sourceFilePath;
                sourceFilePath = sourceFilePath.replace(/#/g, 'Ñ').replace(/\$/g, 'Ñ');
                this.log(`🔧 Corrigiendo caracteres mal codificados: "${originalPath}" → "${sourceFilePath}"`);
            }
            
            // Si ya es una URI member:, devolverla tal como está
            if (sourceFilePath.startsWith('member:')) {
                this.log(`Ya es URI member, devolviendo: ${sourceFilePath}`);
                return sourceFilePath;
            }
            
            // Convertir ruta de IBM i (ej: QRPGSRC/LIBXXX.file/PRUEBA.rpgle) a member: URI
            if (sourceFilePath.includes('/') && sourceFilePath.includes('.file/')) {
                // Formato: SOURCEFILE/LIBRARY.file/MEMBER.extension
                const parts = sourceFilePath.split('/');
                if (parts.length >= 3) {
                    const sourceFile = parts[0]; // QRPGSRC
                    const libraryPart = parts[1]; // LIBXXX.file
                    const memberWithExt = parts[2]; // PRUEBA.rpgle
                    
                    const library = libraryPart.replace('.file', ''); // LIBXXX
                    
                    // CORRECCION: Usar memberWithExt completo, no solo memberName
                    // Y corregir el orden: library debe ir primero, luego sourceFile
                    const memberUri = `member:/${library}/${sourceFile}/${memberWithExt}`;
                    this.log(`Convertido a URI member: ${memberUri}`);
                    this.log(`  - Library: ${library}`);
                    this.log(`  - SourceFile: ${sourceFile}`);
                    this.log(`  - Member: ${memberWithExt}`);
                    return memberUri;
                }
            }
            
            // Si no se puede convertir, devolver como está
            this.log(`No se pudo convertir, devolviendo original: ${sourceFilePath}`);
            return sourceFilePath;
            
        } catch (error) {
            this.log(`Error convirtiendo a member URI: ${error.message}`);
            return sourceFilePath;
        }
    }

    /**
     * Procesar archivo ZIP de resultados de cobertura CODECOV
     * Implementación especializada para reportes de cobertura
     */
    async processCoverageResults(zipPath, originalFilePath) {
        try {
            this.log('INICIO processCoverageResults');
            this.log('zipPath: ' + zipPath);
            this.log('originalFilePath: ' + originalFilePath);
            
            // 1. Descargar archivo ZIP desde IBM i
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const tmpFile = tmp.fileSync();
            this.log('tmpDir: ' + tmpDir.name);
            this.log('tmpFile: ' + tmpFile.name);
            
            const content = this.connection.getContent();
            this.log('Descargando ZIP de IBM i...');
            await content.downloadStreamfileRaw(zipPath, tmpFile.name);
            this.log('ZIP descargado exitosamente');
            
            // 2. Extraer contenido
            this.log('Extrayendo ZIP...');
            const directory = await unzipper.Open.file(tmpFile.name);
            await directory.extract({ path: tmpDir.name });
            this.log('ZIP extraído exitosamente');
            
            // 3. Leer archivo XML de cobertura
            const ccdataPath = path.join(tmpDir.name, 'ccdata');
            this.log('Leyendo archivo ccdata desde: ' + ccdataPath);
            const ccdataContent = fs.readFileSync(ccdataPath);
            this.log('ccdata leído, tamaño: ' + ccdataContent.length + ' bytes');
            
            this.log('Parseando XML...');
            const xml = await xml2js.parseStringPromise(ccdataContent);
            this.log('XML parseado exitosamente');
            
            // 4. Parsear datos XML
            this.log('Llamando a parseXmlCoverage...');
            const coverageDataArray = await this.parseXmlCoverage(xml, tmpDir.name, originalFilePath);
            
            // 5. Limpiar archivos temporales
            tmpDir.removeCallback();
            tmpFile.removeCallback();
            
            this.log(`Retornando ${coverageDataArray.length} archivos de cobertura`);
            return coverageDataArray;
        } catch (error) {
            logger.error('Error procesando resultados:', error);
            throw error;
        }
    }

    /**
     * Parsear XML de cobertura CODECOV para generación de reportes
     */
    async parseXmlCoverage(xml, tmpDir, originalFilePath) {
        try {
            this.log('INICIO parseXmlCoverage para: ' + originalFilePath);
            this.log('XML structure: ' + JSON.stringify(Object.keys(xml), null, 2));
            this.log('LLC exists: ' + !!xml.LLC);
            this.log('lineLevelCoverageClass exists: ' + !!xml.LLC?.lineLevelCoverageClass);
            
            const items = [];

            for (const source of xml.LLC.lineLevelCoverageClass) {
                const data = source['$'];
                const testCase = source.testcase?.[0]?.['$'] || { hits: '' };

                // Debug de datos XML
                this.log(`=== Procesando archivo fuente: ${data.sourceFile} ===`);
                this.log(`Data del XML: ${JSON.stringify(data, null, 2)}`);
                this.log(`TestCase del XML: ${JSON.stringify(testCase, null, 2)}`);

                // Leer código fuente del archivo extraído o remotamente
                let sourceCode;
                if (tmpDir) {
                    // Modo .cczip: leer del directorio temporal extraído
                    const sourcePath = path.join(tmpDir, 'src', data.sourceFile);
                    this.log(`Leyendo código fuente desde archivo extraído: ${sourcePath}`);
                    const rawSource = fs.readFileSync(sourcePath);
                    sourceCode = rawSource.toString().split('\n');
                } else {
                    // Modo configuración JSON: intentar leer remotamente
                    this.log(`Leyendo código fuente remotamente: ${data.sourceFile}`);
                    try {
                        // Extraer biblioteca del nombre del archivo en XML
                        const memberUri = this.convertToMemberUri(data.sourceFile);
                        this.log(`URI convertida: ${memberUri}`);
                        
                        // Intentar descargar el código fuente remotamente
                        const sourceContent = await this.downloadMemberSource(memberUri);
                        sourceCode = sourceContent.split('\n');
                        this.log(`Código fuente descargado exitosamente: ${sourceCode.length} líneas`);
                    } catch (error) {
                        this.log(`Error descargando código fuente: ${error.message}`);
                        // Fallback: usar líneas numeradas simuladas
                        const maxLine = Math.max(...Object.keys(this.getLines(data.v2fileLines || data.lines, [])).map(Number));
                        sourceCode = Array.from({length: maxLine}, (_, i) => `// Línea ${i + 1}`);
                        this.log(`Usando ${sourceCode.length} líneas simuladas`);
                    }
                }

                // Procesar hits y líneas activas
                const realHits = testCase.v2fileHits || testCase.hits;
                const realLines = data.v2fileLines || data.lines;
                
                this.log(`realHits: "${realHits}"`);
                this.log(`realLines: "${realLines}"`);

                const indexesExecuted = this.getRunLines(sourceCode.length, realHits);
                const activeLines = this.getLines(realLines, indexesExecuted);

                // Calcular estadísticas
                const lineKeys = Object.keys(activeLines).map(Number).sort((a, b) => a - b);
                let countRan = 0;
                lineKeys.forEach(key => {
                    if (activeLines[key] === true) {
                        countRan++;
                    }
                });

                // Filtrar líneas válidas (dentro del rango del código fuente actual)
                const validLineKeys = lineKeys.filter(lineNum => lineNum > 0 && lineNum <= sourceCode.length);
                const validCountRan = validLineKeys.filter(lineNum => activeLines[lineNum] === true).length;
                
                this.log(`Debug cobertura detallado para ${originalFilePath}:`);
                this.log(`- Líneas en sourceCode: ${sourceCode.length}`);
                this.log(`- Líneas en XML (activeLines): ${lineKeys.length}`);
                this.log(`- Líneas válidas filtradas: ${validLineKeys.length}`);
                this.log(`- Líneas cubiertas válidas: ${validCountRan}`);
                this.log(`- Rango de líneas XML: ${Math.min(...lineKeys)} - ${Math.max(...lineKeys)}`);
                
                // Debug adicional: mostrar qué líneas detectó CODECOV como ejecutables
                this.log(`- Líneas ejecutables según CODECOV: [${lineKeys.join(', ')}]`);
                this.log(`- Líneas cubiertas según CODECOV: [${lineKeys.filter(line => activeLines[line]).join(', ')}]`);
                this.log(`- Líneas NO cubiertas según CODECOV: [${lineKeys.filter(line => !activeLines[line]).join(', ')}]`);
                
                // Debug del código fuente: mostrar primeras líneas para verificar
                this.log(`- Primeras 10 líneas del código fuente:`);
                sourceCode.slice(0, 10).forEach((line, index) => {
                    const lineNum = index + 1;
                    const isExecutable = lineKeys.includes(lineNum);
                    const isCovered = activeLines[lineNum] === true;
                    this.log(`  ${lineNum}: ${isExecutable ? (isCovered ? '[CUBIERTA]' : '[NO CUBIERTA]') : '[NO EJECUTABLE]'} "${line.trim()}"`);
                });

                const effectiveTotal = validLineKeys.length > 0 ? validLineKeys.length : lineKeys.length;
                const effectiveCovered = validLineKeys.length > 0 ? validCountRan : countRan;
                const coveragePercentage = parseFloat(((effectiveCovered / effectiveTotal) * 100).toFixed(2));

                const finalLineKeys = validLineKeys.length > 0 ? validLineKeys : lineKeys;

                // Usar el nombre real del archivo desde el XML y convertirlo correctamente
                const realSourcePath = this.convertToMemberUri(data.sourceFile);
                this.log(`Archivo procesado: ${data.sourceFile} -> ${realSourcePath}`);
                
                items.push({
                    filePath: realSourcePath,
                    sourceFileName: data.sourceFile,
                    totalLines: effectiveTotal,
                    coveredLines: finalLineKeys.filter(line => activeLines[line]),
                    uncoveredLines: finalLineKeys.filter(line => !activeLines[line]),
                    coveragePercentage: coveragePercentage,
                    timestamp: new Date().toISOString(),
                    activeLines: activeLines,
                    sourceCode: sourceCode // Agregar el código fuente extraído del .cczip
                });
            }

            this.log(`Procesados ${items.length} archivos de cobertura`);
            return items; // Retornar todos los items
        } catch (error) {
            this.logError('Error parseando XML: ' + error.message);
            this.log('Detalles del error: ' + error.message);
            this.log('Stack trace: ' + error.stack);

            logger.error('Error parseando XML:', error);
            throw error;                

        }
    }

    /**
     * Procesar líneas ejecutadas desde string de hits
     */
    getRunLines(numLines, hits) {
        const hitLines = [];
        let hitChar;
        
        for (let i = 0, lineIndex = 0; lineIndex < numLines && i < hits.length; i++) {
            hitChar = hits.charCodeAt(i);

            if (hitChar <= 80) {
                hitChar -= 65;

                if (hitChar === 0) {
                    lineIndex += 4;
                } else {
                    if ((hitChar & 8) !== 0) {
                        hitLines.push(lineIndex);
                    }
                    lineIndex++;

                    if ((hitChar & 4) !== 0 && lineIndex < numLines) {
                        hitLines.push(lineIndex);
                    }
                    lineIndex++;

                    if ((hitChar & 2) !== 0 && lineIndex < numLines) {
                        hitLines.push(lineIndex);
                    }
                    lineIndex++;

                    if ((hitChar & 1) !== 0 && lineIndex < numLines) {
                        hitLines.push(lineIndex);
                    }
                    lineIndex++;
                }
            }
        }

        return hitLines;
    }

    /**
     * Parsear string de líneas y mapear con hits ejecutados
     */
    getLines(lineString, indexesExecuted) {
        const lineNumbers = [];
        let line = 0;
        let currentValue = '';
        let concat = false;

        for (const char of lineString) {
            switch (char) {
                case '#':
                    if (currentValue !== '') {
                        line = Number(currentValue);
                        lineNumbers.push(line);
                    }
                    concat = true;
                    line = 0;
                    currentValue = '';
                    break;

                case ',':
                    if (currentValue !== '') {
                        line = Number(currentValue);
                        lineNumbers.push(line);
                    }
                    currentValue = '';
                    break;

                case '+':
                    line = Number(currentValue);
                    lineNumbers.push(line);
                    concat = false;
                    break;

                default:
                    if (concat) {
                        currentValue += char;
                    } else {
                        currentValue = '';
                        line += Number(char);
                        lineNumbers.push(line);
                    }
                    break;
            }
        }

        let lines = {};
        for (const i in lineNumbers) {
            lines[lineNumbers[i]] = indexesExecuted.includes(Number(i));
        }

        return lines;
    }

    /**
     * Ejecutar cobertura para configuración JSON (sin sourceLibrary)
     */
    async executeCoverageForConfig(moduleInfo) {
        // Declarar variables de limpieza fuera del try para acceso en catch
        let tempStorage = null;
        let createdResources = {
            programs: [],     // Programas CL creados en ILEDITOR
            sourceFiles: [],  // Archivos fuente creados en ILEDITOR
            tempFiles: []     // Archivos temporales en IFS
        };
        
        try {
            this.log('=== INICIO executeCoverageForConfig ===');
            this.log('moduleInfo: ' + JSON.stringify(moduleInfo, null, 2));
            
            // Extraer información según el tipo
            let qualifiedProgram, moduleSpecForCodecov;
            
            if (moduleInfo.type === 'simplified') {
                // Modo simplificado: library se extraerá del XML, usar solo el program por ahora
                // Para el comando CODECOV, usar el moduleSpec completo del JSON
                qualifiedProgram = moduleInfo.program; // Solo el programa, la library vendrá del XML
                
                // Usar el moduleSpec completo desde la configuración para el comando CODECOV
                moduleSpecForCodecov = `(${moduleInfo.moduleSpec})`;
                
                this.log(`Simplified mode: program=${qualifiedProgram}, moduleSpec=${moduleSpecForCodecov}`);
                this.log(`Library, sourceFile y sourceMember se extraerán automáticamente del resultado XML`);
            } else {
                throw new Error(`Unsupported moduleInfo type: ${moduleInfo.type}`);
            }        
            
            // Configurar archivos temporales para resultados - usar el program directamente
            tempStorage = this.setupTempStorage(qualifiedProgram);
            this.log('Archivos temporales configurados: ' + JSON.stringify(tempStorage, null, 2));
            
            // Leer configuración de CODECOV (ccView y ccLevel)
            const testingConfig = readTestingConfig();
            const ccView = testingConfig.codecov.ccView || '*SOURCE';
            const ccLevel = testingConfig.codecov.ccLevel || '*LINE';
            
            // Construir comando CODECOV usando el moduleSpec desde la configuración
            this.log('Construyendo comando CODECOV...');

            // SOLUCIÓN DEFINITIVA: Programa CL compilado en ILEDITOR para ejecutar comandos en el mismo trabajo
            this.log('🔄 Ejecutando CHGJOB y CODECOV en el mismo trabajo usando programa CL en ILEDITOR...');

            const { result: codecovResult } = await this.codecovRunner.run({
                moduleInfo,
                moduleSpecForCodecov,
                ccView,
                ccLevel,
                tempStorage,
                createdResources
            });

            this.log('Resultado CODECOV: ' + JSON.stringify(codecovResult, null, 2));

            // Almacenar el stderr de la ejecución (exitosa o fallida) para consulta posterior
            this.storeExecutionLog(codecovResult.stderr);
            
            if (codecovResult.code !== 0) {
                throw new Error(`CODECOV falló: ${codecovResult.stderr || codecovResult.message || 'Error desconocido'}`);
            }
            
            // El comando CODECOV ya ejecutó el programa y generó el archivo .cczip
            // Ahora procesar el archivo .cczip generado usando la función existente
            // Pasamos null como targetFilePath para que se extraiga automáticamente
            this.log('Procesando archivo .cczip generado y extrayendo toda la información automáticamente...');
            const coverageDataArray = await this.processCoverageResults(tempStorage.ccStmf, null);
            
            // Limpiar archivos temporales (incluye archivos estándar y recursos de ILEDITOR)
            await this.cleanupAllTempFilesInConfig(tempStorage, createdResources);
            
            // Devolver resultado
            if (coverageDataArray && coverageDataArray.length > 0) {
                this.log(`✅ Cobertura extraída exitosamente para ${coverageDataArray.length} módulo(s)`);
                coverageDataArray.forEach((coverage, index) => {
                    this.log(`  [${index + 1}] ${coverage.filePath} - ${coverage.coveragePercentage}% (${coverage.sourceFileName || 'N/A'})`);
                });
                // Retornar el array completo con todos los resultados
                return coverageDataArray;
            } else {
                throw new Error('Coverage data could not be extracted from the .cczip file');
            }
            
        } catch (error) {
            this.logError('Error en executeCoverageForConfig: ' + error.message);
            
            // Intentar limpieza completa de todos los archivos temporales creados
            try {
                await this.cleanupAllTempFilesInConfig(tempStorage, createdResources);
            } catch (cleanupError) {
                this.logError(`Error adicional durante limpieza en catch: ${cleanupError.message}`);
            }
            
            throw error;
        }
    }

    /**
     * Descargar código fuente de un miembro remoto
     */
    async downloadMemberSource(memberUri) {
        try {
            this.log(`Descargando código fuente de: ${memberUri}`);
            
            // Parsear la URI member:
            const memberInfo = this.parseMemberUri(memberUri);
            this.log(`Member info: ${JSON.stringify(memberInfo, null, 2)}`);
            
            // Construir comando para leer el miembro
            const tempStmf = `/tmp/source_${Date.now()}.tmp`;
            const copyCmd = `CPYTOSTMF FROMMBR('${memberInfo.library}/${memberInfo.srcFile}(${memberInfo.memberName})') TOSTMF('${tempStmf}') STMFOPT(*REPLACE)`;
            
            this.log(`Comando CPYTOSTMF: ${copyCmd}`);
            
            const result = await this.connection.runCommand({
                command: copyCmd
            });
            
            if (result.code !== 0) {
                throw new Error(`Error copying member: ${result.stderr || result.message}`);
            }
            
            // Descargar el archivo temporal
            const content = await this.connection.downloadStreamfile(tempStmf);
            
            // Limpiar archivo temporal
            await this.connection.runCommand({
                command: `rm '${tempStmf}'`
            });
            
            return content;
            
        } catch (error) {
            this.logError(`Error descargando código fuente: ${error.message}`);
            throw error;
        }
    }



    /**
     * Limpiar mensajes de error eliminando códigos informativos y dejando solo errores críticos
     */
    cleanErrorMessage(errorMessage) {
        return this.codecovRunner.cleanErrorMessage(errorMessage);
    }

    /**
     * Obtener el log de la última ejecución limpio
     */
    getLastExecutionLog() {
        return this.codecovRunner.getLastExecutionLog();
    }

    /**
     * Almacenar el stderr de la ejecución actual
     */
    storeExecutionLog(stderr) {
        return this.codecovRunner.storeExecutionLog(stderr);
    }

    /**
     * Limpiar recursos locales (archivos descargados)
     * Para archivos temporales remotos en IBM i, usar cleanupTempFiles()
     */
    cleanup() {
        // Limpiar archivos temporales locales si existen
        this.tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                logger.error('Error limpiando archivo temporal local:', error);
            }
        });
    }
}

module.exports = { 
    realCoverageExecutor: RealCoverageExecutor,
    readTestingConfig: readTestingConfig
};
