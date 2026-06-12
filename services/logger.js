const fs = require('fs');
const path = require('path');

/**
 * Optimized, Centralized Logging System
 * Supports non-blocking I/O, Error serialization, and structured JSON.
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const COLORS = {
    RESET: '\x1b[0m',
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[35m'  // Magenta
};

class Logger {
    constructor() {
        // Use __dirname so log path is stable regardless of Electron launch directory
        this.logDir = path.join(__dirname, '..', 'logs');
        this.isDev = process.env.NODE_ENV !== 'production';
        this.consoleEnabled = process.env.DISABLE_LOG_CONSOLE !== 'true';

        // 🛡️ Log Level Safety: Ensure valid level or fallback to INFO
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        this.currentLevel = LOG_LEVELS[envLevel] !== undefined ? envLevel : 'INFO';

        // Ensure log directory exists (sync on startup is acceptable)
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        this.appLogFile = path.join(this.logDir, 'app.log');
        this.errorLogFile = path.join(this.logDir, 'error.log');
    }

    /**
     * Get the current date in YYYY-MM-DD format for rotation.
     */
    _getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Internal method to format and write logs.
     */
    _log(level, message, meta = null) {
        try {
            const levelValue = LOG_LEVELS[level];
            const currentLevelValue = LOG_LEVELS[this.currentLevel];

            // Filter by log level (but always allow ERROR)
            if (levelValue > currentLevelValue && level !== 'ERROR') {
                return;
            }

            // 🧾 ERROR STACK SUPPORT: Extract stack trace if meta is an Error
            if (meta instanceof Error) {
                meta = {
                    message: meta.message,
                    stack: meta.stack
                };
            }

            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                ...(meta && { meta }) // 📦 Consistent 'meta' key
            };

            const jsonString = JSON.stringify(logEntry) + '\n';

            // 🗂️ Daily Rotation Logic
            const dateStr = this._getDateString();
            const dailyLogFile = path.join(this.logDir, `app-${dateStr}.log`);
            const dailyErrorLogFile = path.join(this.logDir, `error-${dateStr}.log`);

            // ⚡ Non-blocking I/O: Fire-and-forget append
            // 1. Write to Daily Log
            fs.appendFile(dailyLogFile, jsonString, () => {});

            // 2. Write to Central App Log
            fs.appendFile(this.appLogFile, jsonString, () => {});

            // 3. Write to Daily Error Log if level is ERROR
            if (level === 'ERROR') {
                fs.appendFile(this.errorLogFile, jsonString, () => {});
                fs.appendFile(dailyErrorLogFile, jsonString, () => {});
            }

            // 4. Console Output (if enabled)
            if (this.consoleEnabled) {
                const color = COLORS[level] || COLORS.RESET;
                const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
                
                // Pretty output for developers
                console.log(
                    `${color}[${timestamp}] [${level}]${COLORS.RESET} ${message}${metaString}`
                );
            }
        } catch (err) {
            // SILENT FAIL: Logging must never crash the app
            process.stderr.write(`[Logger Internal Error]: ${err.message}\n`);
        }
    }

    error(message, meta = null) {
        this._log('ERROR', message, meta);
    }

    warn(message, meta = null) {
        this._log('WARN', message, meta);
    }

    info(message, meta = null) {
        this._log('INFO', message, meta);
    }

    debug(message, meta = null) {
        this._log('DEBUG', message, meta);
    }
}

// Export a singleton instance
module.exports = new Logger();
