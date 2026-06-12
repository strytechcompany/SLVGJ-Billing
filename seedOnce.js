const db = require('./database/db');
const goldRate = require('./services/goldRateService');
const logger = require('./services/logger');

const products = [
    { id: 'P001', name: '22K Gold Chain', barcode: '123456789012', gw: 10.5, sw: 0, nw: 10.5, purity: '22K', rate: 6500, making: 1200, stock: 1 },
    { id: 'P002', name: '18K Diamond Ring', barcode: '123456789013', gw: 5.2, sw: 0.8, nw: 4.4, purity: '18K', rate: 5800, making: 2500, stock: 1 },
    { id: 'P003', name: 'Platinum Wedding Band', barcode: '123456789014', gw: 6.8, sw: 0, nw: 6.8, purity: '950', rate: 4200, making: 1800, stock: 1 },
    { id: 'P004', name: 'Silver Anklets', barcode: '123456789015', gw: 45.0, sw: 2.0, nw: 43.0, purity: '92.5', rate: 85, making: 450, stock: 1 },
    { id: 'P005', name: '22K Gold Bangles', barcode: '123456789016', gw: 25.0, sw: 0, nw: 25.0, purity: '22K', rate: 6500, making: 3500, stock: 1 },
    { id: 'P006', name: 'Emerald Pendant 18K', barcode: '123456789017', gw: 8.4, sw: 1.2, nw: 7.2, purity: '18K', rate: 5800, making: 2200, stock: 1 },
    { id: 'P007', name: 'Pearl Necklace', barcode: '123456789018', gw: 55.0, sw: 35.0, nw: 20.0, purity: 'N/A', rate: 250, making: 1500, stock: 1 },
    { id: 'P008', name: 'Silver Coin (10g)', barcode: '123456789019', gw: 10.0, sw: 0, nw: 10.0, purity: '99.9', rate: 95, making: 100, stock: 1 },
    { id: 'P009', name: 'Gold Earrings 22K', barcode: '123456789020', gw: 6.5, sw: 0, nw: 6.5, purity: '22K', rate: 6500, making: 900, stock: 1 },
    { id: 'P010', name: 'Platinum Studs', barcode: '123456789021', gw: 3.2, sw: 0, nw: 3.2, purity: '950', rate: 4200, making: 2800, stock: 1 },
];

try {
    const insert = db.prepare(`
        INSERT OR REPLACE INTO products (product_id, name, barcode, gross_weight, stone_weight, net_weight, purity, price_per_gram, making_charge, stock)
        VALUES (@id, @name, @barcode, @gw, @sw, @nw, @purity, @rate, @making, @stock)
    `);

    db.transaction((data) => {
        for (const p of data) insert.run(p);
    })(products);

    console.log('✔ Successfully forced seed of 10 core products.');

    try {
        goldRate.setGoldRate(6500);
        console.log('✔ Successfully forced seed of daily gold rate (₹6,500).');
    } catch (e) {
        console.log('ℹ Gold rate already active or non-critical error during seed.');
    }

} catch (err) {
    console.error('❌ CRITICAL SEED FAILURE:', err.message);
    process.exit(1);
}

process.exit(0);
