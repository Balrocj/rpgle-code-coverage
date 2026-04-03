'use strict';

/**
 * Comandos y utilidades de navegacion de fuentes de cobertura.
 */
function createNavigationCommands(deps) {
    const {
        vscode,
        logger,
        getOutputChannel,
        getCoverageData
    } = deps;

    async function openFile(filePath) {
        const outputChannel = getOutputChannel();
        const coverageData = getCoverageData();

        try {
            outputChannel.appendLine(`Intentando abrir archivo: ${filePath}`);

            if (filePath.includes('.listing.')) {
                const message = 'The source code cannot be displayed when the coverage is run in *LIST format. ' +
                              'The source code can only be viewed with the *SOURCE formatted coverage.';
                outputChannel.appendLine(`⚠️ Coverage executed with *LIST: ${filePath}`);
                await vscode.window.showWarningMessage(message);
                return;
            }

            outputChannel.appendLine(`🔍 Buscando cobertura para: ${filePath}`);
            outputChannel.appendLine(`📊 Archivos disponibles en coverageData: ${coverageData.size}`);
            Array.from(coverageData.keys()).forEach(key => {
                const hasSourceCode = coverageData.get(key)?.sourceCode ? '✅' : '❌';
                outputChannel.appendLine(`  - ${key} ${hasSourceCode} sourceCode`);
            });

            if (filePath.startsWith('member:')) {
                await tryOpenMember(filePath);
            } else if (isIBMiSourcePath(filePath)) {
                const memberUri = convertIBMiPathToMemberUri(filePath);
                outputChannel.appendLine(`Ruta IBM i detectada, convirtiendo: ${filePath} -> ${memberUri}`);
                await tryOpenMember(memberUri);
            } else {
                outputChannel.appendLine(`Abriendo como archivo local: ${filePath}`);
                try {
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc, {
                        preview: true,
                        viewColumn: vscode.ViewColumn.Active
                    });

                    await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
                } catch (error) {
                    outputChannel.appendLine(`Error abriendo archivo local: ${error.message}`);
                    vscode.window.showErrorMessage(`Error opening file: ${error.message}`);
                }
            }
        } catch (error) {
            outputChannel.appendLine(`Error en openFile: ${error.message}`);
            vscode.window.showErrorMessage(`Error opening file: ${error.message}`);
        }
    }

    async function tryOpenMember(originalUri) {
        const outputChannel = getOutputChannel();

        const uriParts = originalUri.replace('member:', '').split('/').filter(p => p);
        if (uriParts.length < 3) {
            outputChannel.appendLine(`❌ URI invalida: ${originalUri}`);
            outputChannel.appendLine('Esperado: member:/LIBRARY/SRCFILE/MEMBER.EXTENSION');
            vscode.window.showErrorMessage(`Invalid member URI: ${originalUri}`);
            return;
        }

        const library = uriParts[0];
        const originalSrcFile = uriParts[1];
        const memberWithExt = uriParts[2];
        const memberName = memberWithExt.split('.')[0];
        const extension = memberWithExt.includes('.') ? memberWithExt.split('.')[1] : '';

        outputChannel.appendLine(`🔍 Analizando URI: ${originalUri}`);
        outputChannel.appendLine('📋 Componentes extraidos:');
        outputChannel.appendLine(`   - Library: ${library}`);
        outputChannel.appendLine(`   - SourceFile: ${originalSrcFile}`);
        outputChannel.appendLine(`   - Member: ${memberName}`);
        outputChannel.appendLine(`   - Extension: ${extension || '(ninguna)'}`);

        outputChannel.appendLine(`🔧 Intentando abrir URI: ${originalUri}`);
        try {
            const uri = vscode.Uri.parse(originalUri);
            outputChannel.appendLine(`🔗 URI parseada correctamente: ${uri.toString()}`);

            const doc = await vscode.workspace.openTextDocument(uri);
            outputChannel.appendLine('📄 Documento abierto correctamente');

            await vscode.window.showTextDocument(doc, {
                preview: true,
                viewColumn: vscode.ViewColumn.Active
            });
            outputChannel.appendLine('✅ Editor mostrado correctamente');

            await vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
            outputChannel.appendLine(`✅ Exito abriendo URI: ${originalUri}`);
            return;
        } catch (error) {
            outputChannel.appendLine(`❌ Error abriendo URI: ${error.message}`);
            outputChannel.appendLine('🔍 Error detallado:');
            outputChannel.appendLine(`   - Tipo de error: ${error.name}`);
            outputChannel.appendLine(`   - Mensaje: ${error.message}`);
            if (error.stack) {
                outputChannel.appendLine(`   - Stack: ${error.stack}`);
            }
        }

        outputChannel.appendLine(`❌ No se pudo encontrar el miembro ${memberName} en la biblioteca ${library}`);
        outputChannel.appendLine('🔍 Posibles causas:');
        outputChannel.appendLine(`   1. El miembro ${memberName} no existe en ${library}/${originalSrcFile}`);
        outputChannel.appendLine(`   2. No tiene permisos para acceder a la biblioteca ${library}`);
        outputChannel.appendLine('   3. La conexion con IBM i no esta activa');
        outputChannel.appendLine('   4. El formato de la URI no es correcto');

        vscode.window.showErrorMessage(
            `The member ${memberName} could not be found in the library ${library}/${originalSrcFile}. ` +
            'Verify that the member exists and has access to the library.',
            'See Details'
        ).then(selection => {
            if (selection === 'See Details') {
                outputChannel.show();
            }
        });
    }

    function isIBMiSourcePath(filePath) {
        return filePath.includes('/') &&
               (filePath.includes('.file/') ||
                filePath.match(/^[A-Z0-9_ÑÑ]+\/[A-Z0-9_ÑÑ]+\.file\/[A-Z0-9_ÑÑ]+\.[a-zA-Z]+$/));
    }

    function convertIBMiPathToMemberUri(filePath) {
        try {
            const match = filePath.match(/^([A-Z0-9_]+)\/([A-Z0-9_]+)\.file\/([A-Z0-9_]+)\.([a-zA-Z]+)$/);

            if (match) {
                const [, sourceFile, library, member, extension] = match;
                return `member:/${library}/${sourceFile}/${member}.${extension.toLowerCase()}`;
            }

            const parts = filePath.split('/');
            if (parts.length >= 3) {
                const lastPart = parts[parts.length - 1];
                const [member, extension] = lastPart.split('.');
                return `member:/${parts[1].replace('.file', '')}/${parts[0]}/${member}.${extension ? extension.toLowerCase() : 'rpgle'}`;
            }

            return `member:/${filePath.replace(/\//g, '/')}`;
        } catch (error) {
            logger.error(`Error convirtiendo ruta IBM i: ${error.message}`);
            return `member:/${filePath}`;
        }
    }

    return {
        openFile
    };
}

module.exports = {
    createNavigationCommands
};
