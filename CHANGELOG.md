# Changelog

All notable changes to the "RPGLE Code Coverage" extension will be documented in this file.

## [1.4.0] - 2026-04-03

### 🔧 Improvements

- Coverage summary cards in generated reports are now clickable and navigate directly to each program/SRVPGM detail section.
- Added a "Back to summary" link in each detail section to improve navigation in long reports.
- Added new global setting `rpgleCoverage.splitMultipleReports` to optionally generate separate reports when multiple programs/SRVPGM are analyzed.
- Default behavior remains unchanged: report generation is unified unless `rpgleCoverage.splitMultipleReports` is enabled.
- When separate reports are generated, selecting "Open Reports" now opens all generated report files automatically.

## [1.3.0] - 2025-11-29

### 🔧 Improvements

- The extension's performance is improved when it needs to cover more than one object.

## [1.2.1] - 2025-11-28

### 🔧 Improvements

- The error encountered when running a program that receives parameters has been resolved.

## [1.2.0] - 2025-11-23

### 🔧 Improvements

- Messages in the data entry form have been improved.
- Error handling has been improved.
- The functionality to review the log of the last coverage execution is added in order to quickly and easily identify errors in the execution.

## [1.1.0] - 2025-11-22

### 🔧 Form improvement

- Improvements to the data entry form to enhance the user experience
- Clearer labels and instructions for each field
- Improved layout for better readability
- Enhanced validation feedback for incorrect inputs
- Tooltips added for additional guidance on parameters

## [1.0.1] - 2025-11-20

### 🚨 MAJOR IMPROVEMENT - Bundled Chromium Architecture

- **Zero Aditional Configuration for PDF**: PDF generation now works out-of-the-box on any system
- **Plug & Play**: Install extension → PDF immediately available

### ✨ Benefits of Bundled Architecture

- **Corporate-friendly**: Works in restricted environments without external downloads
- **Consistent experience**: PDF generation available for all users, always

### 🔧 Additional Improvements

- **Documentation**: Updated README with clearer installation and usage instructions
- **Reports**: Improved coverage report titles and formatting for better readability
- **Error Handling**: Better logging and diagnostics throughout the extension
- **Fixed**: Extension now uses exclusively bundled Chromium (no longer installs to user `.cache`)
- **Eliminated**: Removed user cache detection logic (no longer needed with bundled architecture)

## [1.0.0] - 2025-11-17

### 🎉 Initial Release

- **Simplified Configuration**: Only 2 parameters required (program to execute and modules)
- **Auto-parameter Extraction**: Automatic extraction of libraries, source files, and IBM i parameters from CODECOV XML results
- **Real-time Coverage Visualization**: Covered (green) and uncovered (red) lines directly in the editor
- **Professional PDF/HTML Reports**: Generate detailed coverage reports suitable for documentation
- **One-click .cczip Processing**: Process existing coverage files with single click
- **Native IBM i Integration**: Seamless integration with Code for IBM i extension
- **Coverage Tree View**: Hierarchical display of coverage results by module
- **Available Files Panel**: Dedicated panel for managing existing .cczip coverage files
- **Automatic Validation**: Background verification of QDEVTOOLS and prerequisites
- **Modern Web UI**: Responsive configuration panel

### Features

- Support for RPGLE and SQLRPGLE files
- Automatic temporary file cleanup
- Coverage statistics and percentages
- Professional reporting suitable for compliance

### Requirements

- Code for IBM i extension
- IBM i system with CODECOV command available
- Programs compiled with *SOURCE/*ALL debug views