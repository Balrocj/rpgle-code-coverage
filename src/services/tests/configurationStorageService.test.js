const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createConfigurationStorageService } = require('../configurationStorageService');

describe('configurationStorageService', () => {
    function createVscodeMock(initialSettings = {}) {
        const settings = { ...initialSettings };
        const updates = [];
        const vscodeMock = {
            workspace: {
                getConfiguration: () => ({
                    get: (key) => settings[key],
                    update: async (key, value) => {
                        updates.push({ key, value });
                        settings[key] = value;
                    }
                })
            },
            testUpdates: updates,
            testSettings: settings
        };

        const configurationTarget = {};
        configurationTarget.Global = 'Global';
        vscodeMock.ConfigurationTarget = configurationTarget;

        return vscodeMock;
    }

    it('saves codecov config and updates global settings', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgle-coverage-'));
        const vscodeMock = createVscodeMock();
        const service = createConfigurationStorageService({ vscode: vscodeMock });

        const codecovConfig = {
            outputOptions: { format: 'PDF' },
            librarySettings: {
                useCodeForIBMiLibraryList: true,
                validateQDEVTOOLS: false
            },
            programToExecute: 'CALL PGM(MYLIB/MYPGM)',
            modules: ['MYLIB/MYPGM *PGM *ALL']
        };

        await service.saveConfiguration(tempDir, codecovConfig);

        const configPath = path.join(tempDir, 'ConfigCoverage.json');
        assert.ok(fs.existsSync(configPath));

        const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.deepStrictEqual(saved.codecov, codecovConfig);

        const updatedKeys = vscodeMock.testUpdates.map((u) => u.key);
        assert.ok(updatedKeys.includes('outputFormat'));
        assert.ok(updatedKeys.includes('useCodeForIBMiLibraryList'));
        assert.ok(updatedKeys.includes('validateQDEVTOOLS'));
    });

    it('loads config with local priority and global fallback', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgle-coverage-'));
        const vscodeMock = createVscodeMock({
            outputFormat: 'HTML',
            useCodeForIBMiLibraryList: true,
            validateQDEVTOOLS: true
        });
        const service = createConfigurationStorageService({ vscode: vscodeMock });

        const local = {
            codecov: {
                programToExecute: 'CALL PGM(MYLIB/MYPGM)',
                modules: ['MYLIB/MYPGM *PGM *ALL'],
                outputOptions: { format: 'PDF' },
                librarySettings: { useCodeForIBMiLibraryList: false }
            }
        };

        fs.writeFileSync(path.join(tempDir, 'ConfigCoverage.json'), JSON.stringify(local, null, 4));

        const combined = await service.loadConfiguration(tempDir);

        assert.strictEqual(combined.outputOptions.format, 'PDF');
        assert.strictEqual(combined.librarySettings.useCodeForIBMiLibraryList, false);
        assert.strictEqual(combined.librarySettings.validateQDEVTOOLS, true);
    });

    it('validateConfiguration throws for missing mandatory fields', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpgle-coverage-'));
        const vscodeMock = createVscodeMock();
        const service = createConfigurationStorageService({ vscode: vscodeMock });

        fs.writeFileSync(
            path.join(tempDir, 'ConfigCoverage.json'),
            JSON.stringify({ codecov: { modules: [] } }, null, 4)
        );

        assert.throws(
            () => service.validateConfiguration(tempDir),
            /Missing required fields/
        );
    });
});
