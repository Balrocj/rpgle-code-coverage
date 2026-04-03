# Screenshots Sugeridos para la Documentación

Esta lista sugiere los screenshots más útiles para la documentación. Puedes tomarlos según los vayas necesitando.

## 📸 Screenshots Prioritarios

### Panel de Configuración
- `config-panel-opening.png` - Ubicación del ícono de configuración (⚙️) en la barra de herramientas
- `config-panel-main.png` - Vista completa del panel de configuración abierto
- `config-panel-program-execution.png` - Campo "Comando de Ejecución del Programa" con ejemplo
- `config-panel-modules.png` - Sección de "Módulos a Analizar" con ejemplos
- `config-panel-advanced.png` - Opciones avanzadas (ccView, ccLevel)
- `config-panel-save-success.png` - Mensaje de éxito al guardar configuración

### Vista de Cobertura
- `coverage-tree-view.png` - Vista de árbol con resultados de cobertura
- `coverage-tree-summary.png` - Nodo de resumen expandido
- `coverage-tree-file-item.png` - Elemento de archivo individual con porcentaje

### Editor con Resaltado
- `editor-highlighting-covered.png` - Líneas verdes (cubiertas)
- `editor-highlighting-uncovered.png` - Líneas rojas (no cubiertas)
- `editor-highlighting-mixed.png` - Archivo con líneas verdes y rojas
- `editor-overview-ruler.png` - Marcadores de cobertura en la barra de desplazamiento

### Reportes
- `report-pdf-sample.png` - Ejemplo de reporte PDF generado
- `report-html-sample.png` - Ejemplo de reporte HTML en navegador
- `reports-folder.png` - Carpeta de reportes abierta

### Archivos de Cobertura Disponibles
- `available-files-view.png` - Vista de archivos .cczip disponibles
- `available-files-refresh.png` - Botón de refrescar archivos
- `available-files-local-select.png` - Diálogo de selección de archivo local

### Barra de Actividad
- `activity-bar-icon.png` - Ícono de RPGLE Code Coverage en la barra de actividad
- `activity-bar-expanded.png` - Panel expandido con todas las vistas

### Output Panel
- `output-panel.png` - Panel de salida con logs de RPGLE Code Coverage
- `output-panel-execution-log.png` - Log de última ejecución

### Configuración de VS Code
- `vscode-settings-output-format.png` - Configuración de formato de salida
- `vscode-settings-coloring.png` - Configuración de coloración inteligente

## 📸 Screenshots Opcionales

### Errores y Advertencias
- `error-qdevtools-missing.png` - Advertencia de QDEVTOOLS faltante
- `error-no-connection.png` - Error de conexión a IBM i
- `warning-list-format.png` - Advertencia de formato *LIST

### Tooltips y Ayuda
- `tooltip-help-icon.png` - Icono de ayuda (?) con tooltip visible
- `tooltip-module-spec.png` - Tooltip explicando especificación de módulo

### Flujo de Trabajo Completo
- `workflow-step1-configure.png` - Paso 1: Configurar
- `workflow-step2-run.png` - Paso 2: Ejecutar cobertura
- `workflow-step3-results.png` - Paso 3: Ver resultados
- `workflow-step4-report.png` - Paso 4: Generar reporte

## 📝 Convenciones de Nombres

### Formato
```
[componente]-[descripción]-[variante].png
```

### Ejemplos
```
config-panel-main.png
editor-highlighting-covered.png
report-pdf-sample-full.png
error-qdevtools-missing-dialog.png
```

## 🎨 Recomendaciones de Captura

### Tamaño
- **Ancho recomendado**: 800-1200px
- **Calidad**: Alta (PNG preferido sobre JPG)
- **Recorte**: Enfocarse en el área relevante, no toda la pantalla

### Contenido
- **Datos de ejemplo**: Usar nombres genéricos (MYLIB, MYPGM)
- **Idioma**: Los screenshots pueden tener texto en inglés o español
- **Resaltados**: Considerar agregar flechas/círculos rojos para destacar elementos importantes

### Anotaciones (Opcional)
Si quieres agregar anotaciones:
- Usa herramientas como Snagit, Greenshot, o ShareX
- Círculos rojos o flechas para destacar
- Números para secuencias de pasos

## 📂 Organización

```
docs/images/
├── config/               # Screenshots del panel de configuración
├── editor/              # Screenshots del editor con cobertura
├── reports/             # Screenshots de reportes
├── tree-view/           # Screenshots de la vista de árbol
└── workflow/            # Screenshots de flujo de trabajo completo
```

## ✅ Lista de Verificación

Cuando agregues un screenshot:
- [ ] Nombre descriptivo y consistente
- [ ] Formato PNG
- [ ] Tamaño adecuado (no demasiado grande)
- [ ] Contenido relevante visible
- [ ] Referenciado en el archivo .md correspondiente

---

**Nota:** No necesitas tomar todos estos screenshots de una vez. Agrégalos según vayas editando la documentación.
