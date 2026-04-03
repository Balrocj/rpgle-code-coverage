# RPGLE Code Coverage - Plan de Refactor y Seguimiento

Ultima actualizacion: 2026-03-29
Estado general: En progreso
Objetivo: Reducir acoplamiento y tamano de archivos monoliticos sin romper funcionalidades actuales.

## Alcance

- Extraer servicios desde src/CodeCoverage.js para mejorar mantenibilidad.
- Mantener compatibilidad de comandos y flujos actuales.
- Aplicar cambios incrementales y verificables.

## Criterios de exito

- No hay regresiones funcionales en ejecucion de cobertura.
- Limpieza de temporales robusta aun en errores.
- Menor complejidad por archivo (responsabilidades separadas).
- Plan y avance visibles en este archivo.

## Politica de no regresion

- No se cambia comportamiento funcional sin validacion explicita.
- Cada extraccion se hace en cambios pequenos y reversibles.
- Se mantiene RealCoverageExecutor como fachada estable hasta completar la migracion.
- Si una verificacion clave falla, se detiene la fase y se corrige antes de continuar.

## Checklist de verificacion por fase

- [ ] Ejecutar cobertura exitosa con estrategia CCSID actual.
- [ ] Ejecutar cobertura con error controlado y validar limpieza de temporales.
- [ ] Validar que se genera y procesa .cczip correctamente.
- [ ] Validar decoraciones y refresco de vistas.
- [ ] Validar comandos principales: Run, Clear, Refresh, Open Config, View Last Log.
- [ ] Verificar que no quedan objetos residuales en ILEDITOR luego de ejecucion y error.

## Estado actual (baseline)

- Archivo dominante: src/CodeCoverage.js (muy alta concentracion de logica).
- Archivo dominante: src/extension.js (comandos + UI + flujo).
- Archivo dominante: src/ConfigurationPanel.js (HTML + manejo + persistencia).

## Plan por fases

### Fase 0 - Estabilizacion previa

- [x] Endurecer limpieza de temporales ILEDITOR/IFS con deduplicacion y reintentos.
- [x] Evitar doble registro de recursos temporales.
- [x] Corregir manejo de error secundario cuando codecovResult es nulo.
- [x] Quitar warning de tsconfig por falta de inputs.

Resultado esperado:
- Menos basura residual y mejor trazabilidad de errores.

### Fase 1 - Extraer nucleo de cobertura

- [x] Crear src/coverage/CleanupService.js.
- [x] Crear src/coverage/TemporaryClProgramService.js.
- [x] Crear src/coverage/CodecovRunner.js.
- [x] Hacer que RealCoverageExecutor delegue en esos servicios.
- [ ] Verificar ejecucion end-to-end en escenarios exitoso y error.

Resultado esperado:
- src/CodeCoverage.js deja de ser punto unico de fallo y baja complejidad.

### Fase 2 - Separar orchestration de extension

- [x] Extraer registro de comandos a src/commands/index.js.
- [x] Mover flujo de cobertura a src/commands/coverageCommands.js.
- [x] Reducir src/extension.js a bootstrap/activate/deactivate.

Resultado esperado:
- Menor acoplamiento UI-comandos-dominio.

### Fase 3 - Desacoplar panel de configuracion

- [x] Separar template HTML, handlers y persistencia del panel.
- [x] Aislar validacion de configuracion en modulo propio.

Resultado esperado:
- Cambios de UI no afectan logica de negocio y viceversa.

## Bitacora de avance

### 2026-03-28

- Se reforzo la limpieza de recursos temporales en src/CodeCoverage.js.
- Se agrego limpieza por estrategia (finally) y limpieza global robusta.
- Se elimino duplicacion de registro de source file temporal.
- Se ajusto tsconfig para evitar warning de "No inputs were found".

### 2026-03-29

- Se creo src/coverage/CleanupService.js con la logica de limpieza extraida.
- RealCoverageExecutor ahora delega metodos de limpieza a CleanupService, manteniendo la misma fachada publica.
- Se creo src/coverage/CodecovRunner.js con: buildCommand, run (bucle de estrategias CCSID), storeExecutionLog, getLastExecutionLog, cleanErrorMessage.
- El bloque ~120 lineas del bucle de estrategias en executeCoverageForConfig se reemplazo por una llamada a codecovRunner.run(...).
- cleanErrorMessage, storeExecutionLog y getLastExecutionLog en CodeCoverage.js ahora delegan a codecovRunner.
- Se creo src/commands/index.js para centralizar registerCommand y reducir ruido en extension.js.
- Se creo src/commands/coverageCommands.js y se movio runCoverage/executeCoverageAnalysis fuera de extension.js, preservando comportamiento.
- activate ahora registra comandos via registerCommands(...), inyectando dependencias explicitas del flujo de cobertura.
- Se creo src/commands/managementCommands.js y se movieron comandos de gestion (config, carpeta de reportes, archivos disponibles, log de ejecucion).
- extension.js ahora cablea handlers de managementCommands en el registro central sin cambiar IDs de comando.
- Se creo src/commands/navigationCommands.js y se movieron openFile + helpers IBM i (tryOpenMember, conversion de rutas, deteccion de source path).
- extension.js ahora registra openFile via navigationCommands y elimina ese bloque inline.
- Se creo src/commands/reportCommands.js y se movio la generacion de reportes (HTML/PDF) fuera de extension.js.
- Se creo src/ui/CoverageTreeDataProvider.js y se extrajo la clase del arbol de cobertura.
- Se creo src/ui/decorations.js y se movio la logica de coloreado/decoraciones del editor.
- Se creo src/commands/resultCommands.js y se movio processResults (+ helper de decoraciones de resultados).
- Se creo src/commands/stateCommands.js y se movieron clearCoverage y refreshView.
- Se creo src/services/pdfService.js y se movio toda la logica de deteccion/validacion de Chromium bundled.
- Se creo src/utils/pathUtils.js y se movieron normalizeUri y getCleanFileName.
- Se corrigio una regresion de PDF: ahora la ruta de Chromium se resuelve desde extensionPath real en runtime.
- src/extension.js quedo reducido a funciones bootstrap (activate/deactivate) y wiring de dependencias.
- Se creo src/services/configurationStorageService.js para encapsular guardado/carga/validacion basica de ConfigCoverage.json y sincronizacion con settings globales.
- ConfigurationPanel ahora delega saveConfiguration/loadConfiguration/testConfiguration a configurationStorageService, reduciendo acoplamiento con fs/path/vscode workspace config.
- Se creo src/ui/configurationPanelTemplate.js y se movio el HTML/CSS/JS del webview fuera de ConfigurationPanel.
- ConfigurationPanel.getWebviewContent ahora es un wrapper del template externo, facilitando mantenimiento de UI.
- Se creo src/services/configurationPanelMessageHandler.js y se extrajo el manejo de mensajes save/load/test/openGlobalSettings del panel.
- ConfigurationPanel quedo reducido a creacion de panel + wiring (85 lineas), con responsabilidades separadas en servicios.
- Se agregaron pruebas unitarias para servicios del panel en src/services/tests (configurationStorageService y configurationPanelMessageHandler).
- Nuevo script npm: test:services para ejecutar la bateria rapida de hardening de servicios.
- Compilacion webpack sin errores nuevos.
- Fase 1 (extracciones) completada. Pendiente: verificacion end-to-end.
- Fase 2 completada.

## Matriz de validacion manual (cierre)

1. Flujo Run Coverage exitoso
Esperado: carga resultados en Coverage Results, muestra conteos y no deja errores en output.
Estado: pendiente

2. Flujo Run Coverage con error controlado
Esperado: mensaje de error claro, limpieza de temporales y sin residuos en ILEDITOR/IFS.
Estado: pendiente

3. Generacion de reporte PDF
Esperado: crea PDF en coverage-reports usando Chromium bundled (sin fallback a HTML).
Estado: ok preliminar (validado manualmente)

4. Generacion de reporte HTML
Esperado: crea HTML cuando outputFormat=HTML y abre archivo/carpeta correctamente.
Estado: pendiente

5. Procesamiento de .cczip (home y local)
Esperado: processCoverageFile/selectLocalCoverageFile cargan resultados sin errores.
Estado: pendiente

6. Decoraciones y refresco
Esperado: coloreado en editor activo, refreshView actualiza arbol y decoraciones.
Estado: pendiente

7. Comandos principales
Esperado: Run, Clear, Refresh, Open Config y View Last Log responden sin error.
Estado: pendiente

8. Panel de configuracion
Esperado: load/save/test/openGlobalSettings funcionan y UI sin caracteres corruptos.
Estado: ok preliminar (validado manualmente)

## Proximo paso recomendado

1. Ejecutar prueba funcional end-to-end contra IBM i: ejecucion exitosa + ejecucion con error controlado.
2. Validar checklist completo de no-regresion (run/clear/refresh/open config/view last log + decoraciones + .cczip).
3. Una vez cerrado el checklist, agregar prueba de integracion ligera para wiring de ConfigurationPanel.
