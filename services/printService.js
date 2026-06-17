// ════════════════════════════════════════════════════════════════════════
//  Print Service – Electron-based silent receipt printing
//
//  Usage:
//    const { printReceipt } = require('./printService');
//    await printReceipt(htmlString);
//
//  NOTE: This module MUST be called from within an Electron main process
//  (or after `app.whenReady()` has resolved).
// ════════════════════════════════════════════════════════════════════════

const { BrowserWindow } = require('electron');
const logger = require('./logger');

// ── Configuration ─────────────────────────────────────────────────────

const PRINT_OPTIONS = {
  silent:          true,     // skip the system print dialog
  printBackground: true,     // include CSS backgrounds / colours
  margins: {
    marginType: 'custom',
    top:    0.1,
    bottom: 0.1,
    left:   0.1,
    right:  0.1,
  },
};

const LOAD_DELAY_MS  = 500;    // wait after did-finish-load before printing
const LOAD_TIMEOUT_MS = 5000;  // fail-safe if content never finishes loading

// ── Print lock (prevents duplicate prints from rapid calls) ───────────
let isPrinting = false;

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Print an HTML receipt string silently (no dialog).
 *
 * Creates a temporary hidden BrowserWindow, loads the HTML, waits for
 * rendering, prints, then destroys the window.
 *
 * @param {string} html – full HTML document string
 * @param {object} [options] – optional overrides for `webContents.print()`
 * @returns {Promise<boolean>} resolves true on success, rejects on error
 */
function printReceipt(html, options = {}) {
  // ── 0. Prevent concurrent prints ──────────────────────────────────
  if (isPrinting) {
    logger.warn('Print request ignored - print already in progress');
    return Promise.reject(new Error('Print already in progress.'));
  }
  isPrinting = true;
  logger.info('Printing sequence started');

  return new Promise((resolve, reject) => {
    // ── 1. Validate input ─────────────────────────────────────────────
    if (!html || typeof html !== 'string') {
      isPrinting = false;
      logger.error('Print failed - invalid HTML input');
      return reject(new Error('printReceipt requires a non-empty HTML string.'));
    }

    let win = null;
    let loadTimer = null;

    try {
      // ── 2. Create hidden window ───────────────────────────────────────
      win = new BrowserWindow({
        show:   false,
        width:  420,          // roughly 5.8 inches at 72 dpi
        height: 600,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration:  false,
        },
      });

      // ── 3. Handle load failure ────────────────────────────────────────
      win.webContents.on('did-fail-load', (_e, code, desc) => {
        clearTimeout(loadTimer);
        logger.error('Print error: content failed to load', { code, desc });
        cleanup(win);
        reject(new Error(`Failed to load receipt content: [${code}] ${desc}`));
      });

      // ── 4. Timeout safety – fail if load never completes ──────────────
      loadTimer = setTimeout(() => {
        logger.error('Print error: content load timed out');
        cleanup(win);
        reject(new Error('Print timeout: content did not load within 5 seconds.'));
      }, LOAD_TIMEOUT_MS);

      // ── 5. On successful load → wait → print ─────────────────────────
      win.webContents.on('did-finish-load', () => {
        clearTimeout(loadTimer);

        // Small delay so CSS/fonts fully resolve before printing
        setTimeout(() => {
          const mergedOptions = { ...PRINT_OPTIONS, ...options };

          try {
            const printPromise = win.webContents.print(mergedOptions);
            if (printPromise && typeof printPromise.then === 'function') {
              printPromise.then(() => {
                logger.info('Receipt printed successfully');
                cleanup(win);
                resolve(true);
              }).catch(err => {
                logger.error('Print subsystem error', { err });
                cleanup(win);
                reject(new Error(`Print failed: ${err.message}`));
              });
            } else {
              // Fallback for older electron versions (just in case)
              logger.info('Receipt printed successfully (sync)');
              cleanup(win);
              resolve(true);
            }
          } catch (err) {
            logger.error('Print subsystem exception', { err });
            cleanup(win);
            reject(new Error(`Print failed: ${err.message}`));
          }
        }, LOAD_DELAY_MS);
      });

      // ── 6. Guard against window being destroyed unexpectedly ────────
      win.on('closed', () => {
        win = null;
      });

      // ── 7. Load the HTML via data URL ─────────────────────────────────
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      win.loadURL(dataUrl);

    } catch (err) {
      clearTimeout(loadTimer);
      logger.error('Unexpected print service error', err);
      cleanup(win);
      reject(new Error(`printReceipt error: ${err.message}`));
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Safely close and dereference the window to prevent memory leaks. */
function cleanup(win) {
  isPrinting = false;
  try {
    if (win && !win.isDestroyed()) {
      win.close();
      win.destroy();
    }
  } catch (_) {
    // already destroyed – ignore
  }
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  printReceipt,
};
