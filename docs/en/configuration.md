# Features Description

Complete guide of all features available in the RPGLE Code Coverage extension.

## 🎯 Main Features

### Real-time Code Coverage Analysis

Run code coverage analysis directly from VS Code with seamless IBM i integration.

**Key benefits:**
- ✅ Live execution on IBM i
- ✅ Automatic results collection
- ✅ No manual file transfers
- ✅ Integration with Code for IBM i

**How to use:**
1. Configure your program and modules

![](../images/CONFIGURACION_VISUAL.png)

2. Click **"Run Code Coverage"** (▶️)

![](../images/CONFIGURACION_EJECUTAR.png)

3. Wait for the analysis to finish
4. View results in real time

### In-editor Coverage Visualization

View coverage results directly in your source editor.

**Color key:**
- 🟢 **Green background** — line executed (covered)
- 🔴 **Red background** — line not executed (not covered)
- ⚪ **No color** — non-executable line (comment, blank)

**Features:**
- Overview markers in the scrollbar
- Instant updates when files are opened
- Persistent visualization while navigating code
- Multi-file support


### Professional Report Generation

Generate full coverage reports in PDF or HTML formats.

#### PDF Reports

**Features:**
- 📄 Publication-ready quality
- 📊 Embedded charts and statistics
- 🎨 Syntax-highlighted code
- 📁 Organized by component
- 🔍 Detailed coverage metrics

**Auto-generation:** Reports are created automatically after each coverage run.

#### HTML Reports

**Features:**
- 🌐 Open in any browser
- 📱 Responsive design
- 🔍 Searchable content
- 💾 Easy to share
- ⚡ Faster generation than PDF

**Change formats:**
```
Settings > RPGLE Code Coverage > Output Format
Choose: PDF or HTML
```

---

### Coverage Tree View

Hierarchical visualization of all coverage results in the sidebar.

**Structure:**
```
📊 Summary (2 files - 75% average)
  ├── 📄 INVOICE01.RPGLE (85%) ✅
  └── 📄 CUSTUTILS.RPGLE (65%) ⚠️
```

**Icons:**
- ✅ **Green check** - Coverage ≥ 80%
- ⚠️ **Yellow warning** - Coverage 50-79%
- ❌ **Red X** - Coverage < 50%

**Interactions:**
- **Click file** - Opens source with coverage highlights
- **Hover** - Shows detailed tooltip with statistics

---

### Process Existing Coverage Files

Import and analyze pre-generated `.cczip` files without re-running coverage.

**Use cases:**
- ✅ Coverage already executed on IBM i
- ✅ Analyzing historical coverage data
- ✅ Sharing coverage results between teams

**Two Methods:**

#### Method 1: From IBM i Home Directory
1. Click **"Refresh Available Files"** (🔄)

![](../images/ARCHIVOS_CCZIP_REFRESCAR.png)

2. See the list of `.cczip` files in your home directory
3. Click a file to process it
4. Results are loaded automatically

![](../images/ARCHIVOS_CCZIP_RESULTADO.png)


#### Method 2: From a folder on your local machine
1. Click **"Select Local Coverage File"** (📂)

![](../images/ARCHIVOS_CCZIP_CARPETA.png)

2. Browse to your `.cczip` file
3. Select the file
4. Results are loaded automatically

---

### Configuration Panel

Modern web-based configuration UI.

**Features:**
- 🎨 Clean and intuitive UI
- ✅ Field validation
- 💡 Contextual help tooltips
- 🔄 Save/Load/Test buttons
- ⚙️ Advanced options

**Sections:**

1. **Program Execution** - Command to run your program
2. **Modules to Analyze** - Configure Programs/Service Programs
3. **Advanced Options** - Configure view and coverage level
4. **Actions** - Save, Load, Test, Advanced Config

---

### IBM i Integration

Deep integration with the Code for IBM i extension.

**Auto-detection:**
- ✅ Active connection state
- ✅ Library list configuration
- ✅ Member URI handling
- ✅ Source file access

**Library validation:**
- Verifies `QDEVTOOLS`
- Validates required libraries
- Warns about missing dependencies
- Suggests fixes

---

### Execution Logging

Complete logging of all coverage operations.

**Output Panel:**
- View progress in real time
- See command execution details
- Monitor file processing
- Track errors and warnings

**Execution logs:** Only available when coverage is run from VS Code.

**Log levels:**
- ℹ️ **INFO** - Normal operations
- ⚠️ **WARNING** - Non-critical issues
- ❌ **ERROR** - Operational failures
- 🐛 **DEBUG** - Detailed diagnostic info

**View Last Execution Log:**
- Click the **"View Last Execution Log"** button
- Opens a formatted log of the most recent coverage execution
- Useful for troubleshooting, e.g., detecting missing libraries
- Shows command output

![](../images/CONFIGURACION_LOGS.png)


### Coverage History

Track coverage over time (via saved report files).

**Automatic timestamping:**
```
coverage-report-2024-11-28-143052.pdf
coverage-report-2024-11-28-150123.pdf
coverage-report-2024-11-29-091545.pdf
```

**Benefits:**
- Compare coverage trends
- Document testing progress
- Archive for compliance
- Track improvements

## 🎨 UI Features

### Activity Bar Integration

Dedicated RPGLE Code Coverage icon in the Activity Bar.

**Visibility:**
- Only shown when connected to IBM i
- Integrates with Code for IBM i connection state
- Clean and ordered UI

---

### Command Palette Integration

All commands available via the Command Palette (`Ctrl+Shift+P`).

**Available commands:**
```
RPGLE Code Coverage: Run Code Coverage
RPGLE Code Coverage: Clear Coverage
RPGLE Code Coverage: Generate Report
RPGLE Code Coverage: Configure Coverage
RPGLE Code Coverage: Open Reports Folder
RPGLE Code Coverage: Refresh Available Files
RPGLE Code Coverage: Select Local Coverage File
RPGLE Code Coverage: View Last Execution Log
```

---

## 📈 Reporting Features

### Coverage Metrics

Detailed statistics in reports:

**Per-file metrics:**
- Total lines in file
- Executable lines count
- Covered lines count
- Not covered lines count
- Coverage percentage
- Progress bar visualization

**Summary metrics:**
- Total files analyzed
- Average coverage
- Overall summary statistics

---

**Related:** [Coverage from Visual Studio](coverage_from_visual_studio.md) | [Coverage from IBM i](coverage_from_ibm_i.md) | [Frequently FAQ](faq.md) | [Troubleshooting](troubleshooting.md)
