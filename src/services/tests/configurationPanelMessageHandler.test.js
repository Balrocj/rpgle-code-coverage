const assert = require('assert');

const { createConfigurationPanelMessageHandler } = require('../configurationPanelMessageHandler');

describe('configurationPanelMessageHandler', () => {
    function createBaseDeps(overrides = {}) {
        const posted = [];
        const logs = [];
        const executedCommands = [];

        const vscode = {
            commands: {
                executeCommand: async (command, ...args) => {
                    executedCommands.push({ command, args });
                }
            }
        };

        const deps = {
            vscode,
            outputChannel: {
                appendLine: (line) => logs.push(line)
            },
            extensionPath: '/tmp/fake-extension',
            configurationStorageService: {
                saveConfiguration: async () => {},
                loadConfiguration: async () => ({ programToExecute: 'CALL PGM(X/Y)' }),
                validateConfiguration: () => {}
            },
            postMessage: (payload) => posted.push(payload),
            ...overrides
        };

        return { deps, posted, logs, executedCommands };
    }

    it('handles load command and posts configLoaded', async () => {
        const { deps, posted } = createBaseDeps();
        const handler = createConfigurationPanelMessageHandler(deps);

        await handler.handleMessage({ command: 'load' });

        assert.strictEqual(posted.length, 1);
        assert.strictEqual(posted[0].command, 'configLoaded');
        assert.ok(posted[0].config);
    });

    it('handles save command and posts configSaved', async () => {
        let savedConfig = null;
        const { deps, posted } = createBaseDeps({
            configurationStorageService: {
                saveConfiguration: async (_path, config) => {
                    savedConfig = config;
                },
                loadConfiguration: async () => ({}),
                validateConfiguration: () => {}
            }
        });

        const handler = createConfigurationPanelMessageHandler(deps);
        const sampleConfig = { programToExecute: 'CALL PGM(LIB/PGM)' };

        await handler.handleMessage({ command: 'save', config: sampleConfig });

        assert.deepStrictEqual(savedConfig, sampleConfig);
        assert.strictEqual(posted[0].command, 'configSaved');
    });

    it('handles test command validation failure and posts testResult error', async () => {
        const { deps, posted } = createBaseDeps({
            configurationStorageService: {
                saveConfiguration: async () => {},
                loadConfiguration: async () => ({}),
                validateConfiguration: () => {
                    throw new Error('Invalid configuration');
                }
            }
        });

        const handler = createConfigurationPanelMessageHandler(deps);

        await handler.handleMessage({ command: 'test' });

        assert.strictEqual(posted[0].command, 'testResult');
        assert.strictEqual(posted[0].success, false);
        assert.match(posted[0].error, /Invalid configuration/);
    });

    it('handles openGlobalSettings command', async () => {
        const { deps, executedCommands } = createBaseDeps();
        const handler = createConfigurationPanelMessageHandler(deps);

        await handler.handleMessage({ command: 'openGlobalSettings' });

        assert.strictEqual(executedCommands.length, 1);
        assert.strictEqual(executedCommands[0].command, 'workbench.action.openSettings');
        assert.deepStrictEqual(executedCommands[0].args, ['@ext:balrocj.rpgle-code-coverage']);
    });
});
