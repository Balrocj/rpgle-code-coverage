'use strict';

class CoverageTreeDataProvider {
    constructor(deps) {
        const { vscode, getCoverageData, getCleanFileName } = deps;
        this.vscode = vscode;
        this.getCoverageData = getCoverageData;
        this.getCleanFileName = getCleanFileName;

        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        const coverageData = this.getCoverageData();

        if (!element) {
            const items = [];
            if (coverageData.size === 0) {
                return [new this.vscode.TreeItem('No coverage data available', this.vscode.TreeItemCollapsibleState.None)];
            }

            const files = Array.from(coverageData.values());
            const avgCoverage = parseFloat((files.reduce((sum, file) => sum + file.coveragePercentage, 0) / files.length).toFixed(2));
            const summaryItem = new this.vscode.TreeItem(
                `Summary (${files.length} files - ${avgCoverage}% average)`,
                this.vscode.TreeItemCollapsibleState.Expanded
            );
            summaryItem.iconPath = new this.vscode.ThemeIcon('graph');
            items.push(summaryItem);
            return items;
        } else if (element.label && element.label.startsWith('Summary')) {
            return Array.from(coverageData.values()).map(coverage => {
                const fileName = this.getCleanFileName(coverage.filePath);

                const item = new this.vscode.TreeItem(
                    `${fileName} (${coverage.coveragePercentage}%)`,
                    this.vscode.TreeItemCollapsibleState.None
                );

                if (coverage.coveragePercentage >= 80) {
                    item.iconPath = new this.vscode.ThemeIcon('pass', new this.vscode.ThemeColor('testing.iconPassed'));
                } else if (coverage.coveragePercentage >= 50) {
                    item.iconPath = new this.vscode.ThemeIcon('warning', new this.vscode.ThemeColor('testing.iconQueued'));
                } else {
                    item.iconPath = new this.vscode.ThemeIcon('error', new this.vscode.ThemeColor('testing.iconFailed'));
                }

                item.command = {
                    command: 'rpgleCoverage.openFile',
                    title: 'Open File',
                    arguments: [coverage.filePath]
                };

                item.tooltip =
                    'Program: ' + fileName + '\n' +
                    'Executable lines: ' + coverage.totalLines + '\n' +
                    'Covered lines: ' + coverage.coveredLines.length + '\n' +
                    'Uncovered lines: ' + coverage.uncoveredLines.length + '\n' +
                    'Coverage: ' + coverage.coveragePercentage + '%\n' +
                    'Analyzed: ' + new Date(coverage.timestamp).toLocaleString('es-ES');

                return item;
            });
        }

        return [];
    }
}

module.exports = { coverageTreeDataProviderClass: CoverageTreeDataProvider };
