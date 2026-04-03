# Preguntas Frecuentes (FAQ)

Respuestas rápidas a preguntas comunes sobre RPGLE Code Coverage.

## Preguntas Generales

### ¿Qué es RPGLE Code Coverage?

RPGLE Code Coverage es una extensión de Visual Studio Code que proporciona análisis de cobertura de código para programas RPGLE y SQLRPGLE en sistemas IBM i. Te ayuda a identificar qué líneas de código se ejecutan durante las pruebas y cuáles no.

### ¿Es gratis?

Sí! RPGLE Code Coverage es completamente gratis y de código abierto bajo la licencia MIT.

### ¿Qué versiones de IBM i son compatibles?

- IBM i 7.3 (con PTF SI80728)
- IBM i 7.4 (con PTFs SI80737 + SI81204)
- IBM i 7.5 (con PTFs SI81216 + SI81217)

### ¿Necesito otras extensiones?

Sí, necesitas la extensión **Code for IBM i** instalada y una conexión activa a tu sistema IBM i.


### ¿Por qué la extensión necesita Code for IBM i?

Code for IBM i proporciona la infraestructura de conexión a tu sistema IBM i. RPGLE Code Coverage usa esta conexión para ejecutar comandos de análisis de cobertura y recuperar resultados.

### ¿Necesito instalar algo en mi sistema IBM i?

Necesitas el comando CODECOV, que requiere PTFs específicos dependiendo de tu versión de IBM i. 

- IBM i 7.3 (con PTF SI80728)
- IBM i 7.4 (con PTFs SI80737 + SI81204)
- IBM i 7.5 (con PTFs SI81216 + SI81217)

### ¿Dónde encuentro QDEVTOOLS?

QDEVTOOLS es parte de las herramientas de desarrollador de IBM. Si no está en tu lista de librerias:
librerias- O crea un programa CL que lo agregue antes de ejecutar tu programa


### "¿Dónde está QDEVTOOLS?"

QDEVTOOLS es requerido para la cobertura de código. Si no está en tu lista de librerias:

1. Agrégalo a tu lista de librerias de Code for IBM i
2. O crea un programa CL que configure tu lista de librerias y llame a tu programa

### "Mi porcentaje de cobertura muestra 0% o un porcentaje inesperadamente bajo"

Verifica que tus programas estén compilados con vistas de depuración **\*SOURCE** o **\*ALL**:
Si ejecutaste la cobertura desde Visual Studio Code: 
1. Revisa el log para asegurarte de que el programa se ejecutó correctamente y que no hace falta ninguna bibliioteca.
2. Pruebe ejecutando la cobertura directamente desde IBM i para aislar problemas.

### "Error: Comando CODECOV no disponible"

Necesitas instalar los PTFs requeridos para tu versión de IBM i (ver tabla arriba).


### ¿Puedo analizar múltiples programas a la vez?

Sí! es posible ejecutar cobertura a multiples programas o service programs en una sola ejecución. Ya sea desde Visual Studio Code o desde IBM i.


### ¿Debo usar \*SOURCE o \*LIST?

**Usa \*SOURCE** (recomendado):
- Más preciso
- Muestra código fuente real
- Requiere que exista el archivo fuente

**Usa \*LIST**:
- Cuando los archivos fuente se han movido o eliminado
- Menos preciso pero siempre disponible
- Muestra formato de listado del compilador


### ¿Cómo veo el reporte PDF?

Los reportes se generan automáticamente después de ejecutar la cobertura. Haz clic en el botón **"Abrir Carpeta de Reportes"** para acceder a ellos.

Ubicación: `<ruta-extension>\coverage-reports\`

### ¿Puedo generar HTML en lugar de PDF?

Sí! Cambia la configuración:
```
Configuración > RPGLE Code Coverage > Formato de Salida > HTML
```

### ¿Cómo proceso un archivo .cczip existente?

**Desde IBM i:**
1. Haz clic en el botón **"Refrescar Archivos Disponibles"**
2. Aparecerán archivos de tu directorio home
3. Haz clic en un archivo para procesarlo

**Desde PC local:**
1. Haz clic en el botón **"Seleccionar Archivo de Cobertura Local"**
2. Navega a tu archivo .cczip
3. Selecciónalo para procesarlo


### ¿Por qué no veo el ícono de RPGLE Code Coverage?

El ícono solo aparece cuando:
- Code for IBM i está instalado
- Estás conectado a un sistema IBM i


### Mi programa requiere parámetros - ¿cómo lo manejo?

Incluye los parámetros en tu Programa a Ejecutar:
```
CALL PGM(MILIB/MIPGM) PARM('param1' 'param2')
```

### ¿Dónde se almacenan los reportes?

En el directorio de instalación de la extensión bajo `coverage-reports/`:
```
%USERPROFILE%\.vscode\extensions\balrocj.rpgle-code-coverage-*\coverage-reports\
```

Usa el botón **"Abrir Carpeta de Reportes"** para acceso fácil.

![](../images/CONFIGURACION_ABRIR_CARPETAS.png)

### ¿Cómo se nombran los archivos de reporte?

Formato: `coverage-report-AAAA-MM-DD-HHMMSS.pdf`

Ejemplo: `coverage-report-2024-11-28-143052.pdf`

### ¿Puedo personalizar el formato del reporte?

Actualmente, los reportes usan un formato profesional estándar. Las versiones futuras pueden incluir opciones de personalización.

### ¿Puedo automatizar ejecuciones de cobertura?

Actualmente, las ejecuciones de cobertura se activan manualmente desde VS Code. La integración de CI/CD puede agregarse en versiones futuras.

### ¿Cómo limpio datos de cobertura antiguos?

Haz clic en el botón **Limpiar Cobertura** (🗑️) en la vista de Resultados de Cobertura.

![](../images/CONFIGURACION_LIMPIAR.png)

**Relacionado:** [Configuración](configuracion.md) | [Solucion de Problemas](solucion_de_problemas.md)