const vscode = require('vscode');

/**
 * Centralized logging utility for RPGLE Code Coverage Extension
 * Provides consistent logging to VS Code output channel with different log levels
 */
class Logger {
    constructor() {
        this.outputChannel = null;
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
    }

    /**
     * Initialize the logger with an output channel
     * @param {vscode.OutputChannel} outputChannel - VS Code output channel
     */
    initialize(outputChannel) {
        this.outputChannel = outputChannel;
        this.info('Logger initialized');
    }

    /**
     * Set the logging level
     * @param {string} level - DEBUG, INFO, WARN, ERROR
     */
    setLogLevel(level) {
        this.logLevel = level;
    }

    /**
     * Check if a log level should be displayed
     * @param {string} level - The level to check
     * @returns {boolean}
     */
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }

    /**
     * Format a log message with timestamp and level
     * @param {string} level - Log level
     * @param {*} messages - Messages to log
     * @returns {string}
     */
    formatMessage(level, ...messages) {
        const timestamp = new Date().toLocaleTimeString('es-ES');
        const formattedMessages = messages.map(msg => 
            typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg)
        ).join(' ');
        return `[${timestamp}] [${level}] ${formattedMessages}`;
    }

    /**
     * Write to output channel if available, otherwise fallback to console
     * @param {string} level - Log level
     * @param {*} messages - Messages to log
     */
    write(level, ...messages) {
        if (!this.shouldLog(level)) {
            return;
        }

        const formattedMessage = this.formatMessage(level, ...messages);
        
        if (this.outputChannel) {
            this.outputChannel.appendLine(formattedMessage);
        } else {
            // Fallback to console if output channel not available
            console.log(formattedMessage);
        }
    }

    /**
     * Log debug messages
     * @param {*} messages - Messages to log
     */
    debug(...messages) {
        this.write('DEBUG', ...messages);
    }

    /**
     * Log info messages
     * @param {*} messages - Messages to log
     */
    info(...messages) {
        this.write('INFO', ...messages);
    }

    /**
     * Log warning messages
     * @param {*} messages - Messages to log
     */
    warn(...messages) {
        this.write('WARN', ...messages);
    }

    /**
     * Log error messages
     * @param {*} messages - Messages to log
     */
    error(...messages) {
        this.write('ERROR', ...messages);
    }

    /**
     * Show the output channel
     */
    show() {
        if (this.outputChannel) {
            this.outputChannel.show();
        }
    }

    /**
     * Clear the output channel
     */
    clear() {
        if (this.outputChannel) {
            this.outputChannel.clear();
        }
    }
}

// Create a singleton instance
const logger = new Logger();

module.exports = logger;