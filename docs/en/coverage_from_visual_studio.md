# Configuration Reference

Comprehensive guide to configure RPGLE Code Coverage.

## Configuration Methods

The RPGLE Code Coverage extension provides a visual interface to simplify configuration.
There are two methods to obtain a coverage report with RPGLE Code Coverage:

1. **From Visual Studio Code** - Using the Visual UI
2. **From IBM i** - Using the Codecov command and reading the resulting `.cczip` file.

## Coverage from Visual Studio Code

When running coverage from VS Code, the extension uses the library list of the active Code for IBM i connection. It is essential to have `QDEVTOOLS` added to the library list because the coverage is generated using tools that reside in that library. If the program to execute is an RPGUnit, you must also include the `RPGUnit` library.

### Open the Panel

Click the **⚙️ Settings** icon in the Coverage Results view.

![](../images/CONFIGURACION_CONFIGURACION.png)

### Required Fields

#### 1. Program Execution Command

The command that will execute your program on IBM i.

**Format:**
```
CALL PGM(LIB/PROGRAM) [PARM('value1' 'value2')]
```
or
```
RUCALLTST TSTPGM(LIB/TEST_PROGRAM)
```

**Examples:**
```
CALL PGM(MYLIB/INVOICE01)
CALL PGM(MYLIB/CUSTPGM) PARM('12345')
RUCALLTST TSTPGM(TESTLIB/TEST_INVOICE)
CLPGM01 /* Your own CL that sets libraries */
```

![](../images/CONFIGURACION_PROGRAMA_EJECUTAR.png)


**💡 Tip:** If the program you want to run requires many libraries, one option is to create a custom CL program to set your library list:

```cl
PGM
	/* Set library list */
	ADDLIBLE LIB(QDEVTOOLS)
	ADDLIBLE LIB(TULIB)
	ADDLIBLE LIB(TULIB2)
	ADDLIBLE LIB(TULIB3)
	ADDLIBLE LIB(TULIB4)
	.
	.
	.
	/* Call your program */
	CALL PGM(TULIB/TUPGM) PARM('param1')
ENDPGM
```

Then use: `CALL PGM(TULIB/CLPGM01)` as your execution command. This avoids relying solely on the Code for IBM i library list.

---

#### 2. Programs/SRVPGM to Analyze

Specify which objects to analyze for coverage.

**Format:**
```
LIB/OBJECT_NAME *TYPE MODULE_NAME_OR_*ALL
```

**Components:**
- **LIB**: IBM i library name where the program or service program resides (max 10 chars)
- **OBJECT_NAME**: Program or service program name (max 10 chars)
- **TYPE**: `*PGM` or `*SRVPGM`
- **MODULE_NAME**: Specific module to test or `*ALL`. When type is `*PGM` it must be `*ALL`.

**Examples:**

```
✅ Single program (all modules):
MYLIB/MYPGM *PGM *ALL

✅ Service Program (all modules):
MYLIB/MYSRVPGM *SRVPGM *ALL

✅ Service Program (specific module):
MYLIB/MYSRVPGM *SRVPGM MODULE1
```

![](../images/CONFIGURACION_PROGRAMA.png)

**Add multiple entries:**
Click **"➕ Add PGM-SRVPGM"** to add more objects to analyze.

✅ Multiple objects example:
```
MYLIB/PGM1      *PGM    *ALL
MYLIB/SRVPGM1   *SRVPGM *ALL
MYLIB/SRVPGM2   *SRVPGM MODULE1
TESTLIB/TESTPGM *PGM    *ALL
```
---

### Advanced Options

#### 3. Debug view: *SOURCE vs *LIST

Select the debug view (`*SOURCE` or `*LIST`) for coverage. `*SOURCE` covers statements present in the main source member. If `/COPY` or `/INCLUDE` bring executable statements from other members, those are only detected with `*LIST`. If your program doesn't have a `*LIST` view, recompile with `DBGVIEW(*ALL)` or `DBGVIEW(*LIST)`.

If compiled with only `*SOURCE`, select `*SOURCE`. If compiled with only `*LIST`, select `*LIST`. If compiled with `*ALL`, you can choose either. Embedded SQL compiled with `DBGVIEW(*SOURCE)` will include all debug views.

`*SOURCE` requires the original source member to be available in the expected path. If it was moved, `*LIST` (which uses object listing) is the available fallback.

In practice, `*SOURCE` is more accurate and recommended when available.

---

#### Coverage Level

Determines coverage granularity.

Options:

| Option | Description | Best For |
|--------|-------------|---------|
| **`*LINE`** | Measures coverage per executed line | General, detailed analysis |
| **`*PROC`** | Measures coverage per procedure | Quick, procedure-level tests |

Recommendation: use `*LINE` for most cases.

#### 4. **Save Configuration**
	- Click **"Save Configuration"**

#### 5. **Run Coverage**
	- Click **"Run Code Coverage"** (play icon)
	- Wait for analysis to complete
	- View results in the Coverage Results panel

![](../images/CONFIGURACION_EJECUTAR.png)

## Global Extension Settings

### Global settings for the extension

Open VS Code settings (`Ctrl+,`) and search for "RPGLE Code Coverage".

#### Output Format

**Setting:** `rpgleCoverage.outputFormat`

**Options:**
- `PDF` (default) - Generate PDF reports. If PDF generation fails, HTML will be generated as fallback.
- `HTML` - Generate HTML reports

![](../images/CONFIGURACION_REPORTES.png)

#### Smart Coloring

**Setting:** `rpgleCoverage.inheritNonExecutableColoring`

**Type:** Boolean (true/false)

**Default:** `false`. Traditional coverage coloring (similar to RDi).

**Description:** When enabled, non-executable lines (comments, blank lines) also inherit coloring. This prevents uncolored lines in the report and can improve visual consistency. **This does not affect coverage percentage or executed line counts — only appearance.**

**Example:**

// Con inheritNonExecutableColoring = false

![](../images/CONFIGURACION_COLORES_FALSE.png)


// Con inheritNonExecutableColoring = true

![](../images/CONFIGURACION_COLORES_TRUE.png)

**Recommendation:** Keep `false` for traditional behavior; enable for consistent visuals.

![](../images/CONFIGURACION_COLORES.png)


## Summary

### ✅ To do

- **Test with a simple program first** before complex configurations
- **Use `*SOURCE`** when available for accuracy
- **Keep config files under version control**
- **Create reusable CL programs** for library setup

### ❌ Do not

- **Do not use `*LIST`** unless source is not available
- **Do not analyze unnecessary modules** (performance)
- **Do not forget QDEVTOOLS** in your library list
- **Do not modify `.cczip` files manually**

---

**Next:** [Coverage from IBM i](coverage_from_ibm_i.md) | [Troubleshooting](troubleshooting.md) | [FAQ](faq.md) 
