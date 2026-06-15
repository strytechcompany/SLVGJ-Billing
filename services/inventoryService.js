const Database = require('better-sqlite3');
const db = require('../database/db'); // Internal DB
const logger = require('./logger');

const EXTERNAL_DB_PATH = 'C:/ProgramData/JewelrySuite/gold_system.db';

const inventoryService = {
    getAllProducts: () => {
        try {
            return db.prepare(`SELECT * FROM products ORDER BY name ASC`).all();
        } catch (err) {
            logger.error('Error fetching inventory', { error: err.message });
            throw err;
        }
    },

    syncExternalStock: () => {
        try {
            logger.info('Starting inventory sync from external DB...');
            // Open external DB in read-only mode
            const externalDb = new Database(EXTERNAL_DB_PATH, { readonly: true });
            
            // Fetch all products from external DB
            const externalProducts = externalDb.prepare(`SELECT * FROM products`).all();
            externalDb.close();

            let syncedCount = 0;

            const upsertStmt = db.prepare(`
                INSERT INTO products (
                    product_id, name, barcode, gross_weight, stone_weight, net_weight, 
                    purity, buying_price, price_per_gram, making_charge, stock
                ) VALUES (
                    @product_id, @name, @barcode, @gross_weight, @stone_weight, @net_weight, 
                    @purity, @buying_price, @price_per_gram, @making_charge, @stock
                )
                ON CONFLICT(product_id) DO UPDATE SET
                    name = excluded.name,
                    barcode = excluded.barcode,
                    gross_weight = excluded.gross_weight,
                    stone_weight = excluded.stone_weight,
                    net_weight = excluded.net_weight,
                    purity = excluded.purity,
                    buying_price = excluded.buying_price,
                    price_per_gram = excluded.price_per_gram,
                    making_charge = excluded.making_charge,
                    stock = excluded.stock
            `);

            // Use a transaction for fast bulk insert
            const syncTransaction = db.transaction((products) => {
                for (const p of products) {
                    upsertStmt.run({
                        product_id: p.product_id,
                        name: p.name,
                        barcode: p.barcode || p.product_id, // Fallback to product_id if barcode is missing
                        gross_weight: p.gross_weight || 0,
                        stone_weight: p.stone_weight || 0,
                        net_weight: p.net_weight || 0,
                        purity: p.purity || 'N/A',
                        buying_price: p.buying_cost || 0, // Map buying_cost -> buying_price
                        price_per_gram: p.price_per_gram || null,
                        making_charge: p.making_charge || 0,
                        stock: p.stock || 0
                    });
                    syncedCount++;
                }
            });

            syncTransaction(externalProducts);
            logger.info(`Inventory sync complete. Updated ${syncedCount} items.`);
            return { success: true, count: syncedCount };

        } catch (err) {
            logger.error('Error syncing external stock', { error: err.message });
            throw new Error('Failed to sync external database: ' + err.message);
        }
    }
};

module.exports = inventoryService;
