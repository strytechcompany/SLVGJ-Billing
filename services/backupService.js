const db = require('../database/db'); // Use the same connection
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const logger = require('./logger');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR   = path.join(PROJECT_ROOT, 'backup');
const DB_PATH      = path.join(PROJECT_ROOT, 'billing.db');

/**
 * Create a non-blocking backup of the live database using better-sqlite3's .backup()
 * @returns {Promise<string|null>}
 */
async function backupDatabase() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const backupFileName = `backup_${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        // Perform atomic, non-blocking backup
        await db.backup(backupPath);

        logger.info(`[Backup Success]: Atomic backup completed to ${backupPath}`);
        return backupPath;
    } catch (error) {
        logger.error(`[Backup Error]: Atomic backup failed: ${error.message}`);
        return null;
    }
}

/**
 * List all available backups in the backup folder.
 * @returns {string[]} - Sorted list of filenames (descending by latest).
 */
function listBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return [];
        }

        const files = fs.readdirSync(BACKUP_DIR);
        
        // Filter only .db files and sort by name (which contains timestamp) descending
        const backups = files
            .filter(file => file.endsWith('.db') && file.startsWith('backup_'))
            .sort((a, b) => b.localeCompare(a));

        logger.info(`Successfully listed ${backups.length} backups`);
        return backups;
    } catch (error) {
        logger.error(`[Backup Error]: Failed to list backups: ${error.message}`, error);
        return [];
    }
}

/**
 * Delete backups older than a specific number of days.
 * @param {number} days - Age threshold in days.
 */
function deleteOldBackups(days) {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;

        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(BACKUP_DIR);

        files.forEach(file => {
            if (!file.endsWith('.db') || !file.startsWith('backup_')) return;

            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);

            if (stats.mtimeMs < cutoffTime) {
                fs.unlinkSync(filePath);
                logger.info(`[Backup Cleanup]: Deleted old backup: ${file}`, { file });
            }
        });
    } catch (error) {
        logger.error(`[Backup Error]: Failed to delete old backups: ${error.message}`, error);
    }
}

/**
 * Restore the database from a backup file.
 * WARNING: This will overwrite the current live database.
 * The application should ideally be restarted after this.
 * @param {string} backupFileName - The name of the file in the /backup folder.
 * @returns {boolean} - Success status.
 */
function restoreDatabase(backupFileName) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFileName);

        if (!fs.existsSync(backupPath)) {
            logger.error(`[Restore Error]: Backup file not found at ${backupPath}`, { backupPath });
            return false;
        }

        // Check if DB exists and potentially back it up one last time before overwriting?
        // For now, we just perform the overwrite as requested for a restore.
        
        fs.copyFileSync(backupPath, DB_PATH);
        logger.info(`[Restore Success]: Database restored from ${backupPath}`, { backupPath });
        return true;
    } catch (error) {
        logger.error(`[Restore Error]: Failed to restore database: ${error.message}`, error);
        return false;
    }
}

/**
 * Get summary statistics of backups.
 * @returns {Object} - Stats including count, total size, and latest backup date.
 */
function getBackupStats() {
    try {
        const backups = listBackups();
        let totalSize = 0;
        let latestDate = null;

        backups.forEach(file => {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            totalSize += stats.size;
            if (!latestDate || stats.mtime > latestDate) {
                latestDate = stats.mtime;
            }
        });

        return {
            count: backups.length,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            latestBackup: latestDate
        };
    } catch (error) {
        logger.error('[Backup Error]: Failed to get stats', error);
        return { count: 0, totalSizeBytes: 0, totalSizeMB: 0, latestBackup: null };
    }
}

/**
 * Export all key database tables to a multi-sheet Excel (.xlsx) file.
 * Each table becomes one sheet. The file is saved in the /backup directory.
 * @returns {string} - Path of the created Excel file.
 */
function exportToExcel() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const fileName = `SriLakshmi_Backup_${timestamp}.xlsx`;
        const filePath = path.join(BACKUP_DIR, fileName);

        const wb = XLSX.utils.book_new();

        // ── Helper: query table and append as a sheet ──────────────────
        const addSheet = (sheetName, sql) => {
            try {
                const rows = db.prepare(sql).all();
                const ws = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            } catch (err) {
                logger.warn(`[Excel Export]: Skipping sheet "${sheetName}": ${err.message}`);
            }
        };

        // Bills (formatted for readability)
        addSheet('Bills', `
            SELECT
                bill_id             AS "Bill No",
                strftime('%d/%m/%Y %H:%M', bill_datetime)  AS "Date & Time",
                customer_name       AS "Customer",
                customer_phone      AS "Phone",
                customer_address    AS "Address",
                subtotal            AS "Subtotal (₹)",
                making_charges      AS "Making Charges (₹)",
                cgst_amount         AS "CGST (₹)",
                sgst_amount         AS "SGST (₹)",
                total_gst_amount    AS "Total GST (₹)",
                final_net_amount    AS "Final Amount (₹)"
            FROM bills
            ORDER BY bill_datetime DESC
        `);

        // Bill Items
        addSheet('Bill Items', `
            SELECT
                bi.bill_id          AS "Bill No",
                bi.item_name        AS "Item Name",
                bi.purity           AS "Purity",
                bi.gross_weight     AS "Gross Wt (g)",
                bi.stone_weight     AS "Stone Wt (g)",
                bi.net_weight       AS "Net Wt (g)",
                bi.rate             AS "Rate/g (₹)",
                bi.making_charge    AS "Making Charge (₹)",
                bi.selling_price    AS "Selling Price/g (₹)",
                bi.total            AS "Total (₹)",
                p.buying_price      AS "Buying Price (₹)",
                ROUND(bi.total - COALESCE(p.buying_price, 0), 2) AS "Margin (₹)"
            FROM bill_items bi
            LEFT JOIN products p ON bi.product_id = p.product_id
            ORDER BY bi.bill_id
        `);

        // Payments
        addSheet('Payments', `
            SELECT
                bill_id         AS "Bill No",
                payment_type    AS "Method",
                amount          AS "Amount (₹)",
                gold_weight     AS "Gold Wt (g)",
                gold_rate       AS "Gold Rate (₹/g)",
                strftime('%d/%m/%Y %H:%M', created_at) AS "Date"
            FROM payments
            ORDER BY created_at DESC
        `);

        // Customers
        addSheet('Customers', `
            SELECT
                customer_id     AS "Customer ID",
                name            AS "Name",
                phone           AS "Phone",
                address         AS "Address",
                strftime('%d/%m/%Y', created_at) AS "Joined"
            FROM customers
            ORDER BY name
        `);

        // Products (inventory)
        addSheet('Products', `
            SELECT
                product_id      AS "Product ID",
                name            AS "Name",
                barcode         AS "Barcode",
                purity          AS "Purity",
                gross_weight    AS "Gross Wt (g)",
                stone_weight    AS "Stone Wt (g)",
                net_weight      AS "Net Wt (g)",
                buying_price    AS "Buying Price (₹)",
                price_per_gram  AS "Sell Rate/g (₹)",
                making_charge   AS "Making Charge (₹)",
                stock           AS "Stock"
            FROM products
            ORDER BY name
        `);

        // Debts (outstanding balances)
        addSheet('Debts', `
            SELECT
                d.debt_id           AS "Debt ID",
                d.bill_id           AS "Bill No",
                c.name              AS "Customer",
                c.phone             AS "Phone",
                d.total_amount      AS "Total (₹)",
                d.paid_amount       AS "Paid (₹)",
                d.remaining_amount  AS "Remaining (₹)",
                d.status            AS "Status",
                strftime('%d/%m/%Y', d.created_at) AS "Date"
            FROM debts d
            LEFT JOIN customers c ON d.customer_id = c.customer_id
            ORDER BY d.created_at DESC
        `);

        XLSX.writeFile(wb, filePath);

        logger.info(`[Excel Export]: Workbook written to ${filePath}`);
        return filePath;
    } catch (error) {
        logger.error(`[Excel Export]: Failed: ${error.message}`);
        throw new Error(`Excel export failed: ${error.message}`);
    }
}

module.exports = {
    backupDatabase,
    listBackups,
    deleteOldBackups,
    restoreDatabase,
    getBackupStats,
    exportToExcel,
};
