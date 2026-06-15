const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dns = require('node:dns');

// Force DNS servers to resolve MongoDB SRV records properly
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('Starting Sri Lakshmi Jewellers Billing System...');
console.log('DNS servers set to Google (8.8.8.8, 8.8.4.4)');

// Initialise database schema & run migrations BEFORE loading services
// (services compile prepared statements at require-time)
require('./database/init');

// Import Backend Services
console.log('Loading backend services...');
const billingService = require('./services/billingService');
const paymentService = require('./services/paymentService');
const checkoutService = require('./services/checkoutService');
const receiptService = require('./services/receiptService');
const backupService = require('./services/backupService');
const printService = require('./services/printService');
const logger = require('./services/logger');
const goldRateService = require('./services/goldRateService');
const authService = require('./services/authService');
const inventoryService = require('./services/inventoryService');
const customerService = require('./services/customerService');
const reportService = require('./services/reportService');
console.log('All services loaded.');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Sri Lakshmi Jewellers - Billing System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built dist index.html or dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function autoSeedIfEmpty() {
    const db = require('./database/db');
    const count = db.prepare("SELECT COUNT(*) as count FROM products").get().count;

    if (count === 0) {
        logger.info('Database empty. Performing auto-seed of 10 items...');
        
        try {
            goldRateService.setGoldRate(6500);
        } catch (e) {
            logger.warn('Auto-seed: could not set default gold rate', { error: e.message });
        }

        const products = [
            { id: 'P001', name: '22K Gold Chain', barcode: '123456789012', gw: 10.5, sw: 0, nw: 10.5, purity: '22K', buying_price: 6000, rate: 6500, making: 1200, stock: 10 },
            { id: 'P002', name: '18K Diamond Ring', barcode: '123456789013', gw: 5.2, sw: 0.8, nw: 4.4, purity: '18K', buying_price: 5200, rate: 5800, making: 2500, stock: 5 },
            { id: 'P003', name: 'Platinum Wedding Band', barcode: '123456789014', gw: 6.8, sw: 0, nw: 6.8, purity: '950', buying_price: 3800, rate: 4200, making: 1800, stock: 3 },
            { id: 'P004', name: 'Silver Anklets', barcode: '123456789015', gw: 45.0, sw: 2.0, nw: 43.0, purity: '92.5', buying_price: 75, rate: 85, making: 450, stock: 20 },
            { id: 'P005', name: '22K Gold Bangles', barcode: '123456789016', gw: 25.0, sw: 0, nw: 25.0, purity: '22K', buying_price: 6000, rate: 6500, making: 3500, stock: 8 },
            { id: 'P006', name: 'Emerald Pendant 18K', barcode: '123456789017', gw: 8.4, sw: 1.2, nw: 7.2, purity: '18K', buying_price: 5200, rate: 5800, making: 2200, stock: 2 },
            { id: 'P007', name: 'Pearl Necklace', barcode: '123456789018', gw: 55.0, sw: 35.0, nw: 20.0, purity: 'N/A', buying_price: 200, rate: 250, making: 1500, stock: 4 },
            { id: 'P008', name: 'Silver Coin (10g)', barcode: '123456789019', gw: 10.0, sw: 0, nw: 10.0, purity: '99.9', buying_price: 85, rate: 95, making: 100, stock: 100 },
            { id: 'P009', name: 'Gold Earrings 22K', barcode: '123456789020', gw: 6.5, sw: 0, nw: 6.5, purity: '22K', buying_price: 6000, rate: 6500, making: 900, stock: 15 },
            { id: 'P010', name: 'Platinum Studs', barcode: '123456789021', gw: 3.2, sw: 0, nw: 3.2, purity: '950', buying_price: 3600, rate: 4200, making: 2800, stock: 6 },
        ];

        const insert = db.prepare(`
            INSERT OR REPLACE INTO products (product_id, name, barcode, gross_weight, stone_weight, net_weight, purity, buying_price, price_per_gram, making_charge, stock)
            VALUES (@id, @name, @barcode, @gw, @sw, @nw, @purity, @buying_price, @rate, @making, @stock)
        `);
        
        db.transaction((data) => {
            for (const p of data) insert.run(p);
        })(products);
        
        logger.info('Auto-seed completed effectively.');
    }
}

app.whenReady().then(() => {
  autoSeedIfEmpty();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers to bridge Frontend calling Backend

ipcMain.handle('billing:addToCart', async (event, barcode) => {
  return billingService.addToCart(barcode);
});

ipcMain.handle('billing:addToCartManual', async (event, productId, weight, sellingPrice) => {
  return billingService.addToCartManual(productId, weight, sellingPrice);
});

ipcMain.handle('billing:getCart', async () => {
  return billingService.getCart();
});

ipcMain.handle('billing:getCartTotal', async () => {
  return billingService.getCartTotal();
});

ipcMain.handle('billing:clearCart', async () => {
  return billingService.clearCart();
});

ipcMain.handle('billing:searchProducts', async (event, query) => {
  return billingService.searchProducts(query);
});

ipcMain.handle('billing:removeFromCart', async (event, index) => {
  return billingService.removeFromCart(index);
});

ipcMain.handle('billing:getProductByBarcode', async (event, barcode) => {
  return billingService.getProductByBarcode(barcode);
});

ipcMain.handle('payment:addPayment', async (event, data, total) => {
  return paymentService.addPayment(data, total);
});

ipcMain.handle('payment:getPayments', async () => {
  return paymentService.getPayments();
});

ipcMain.handle('payment:getTotalPaid', async () => {
  return paymentService.getTotalPaid();
});

ipcMain.handle('payment:calculateRemaining', async (event, total) => {
  return paymentService.calculateRemaining(total);
});

ipcMain.handle('payment:clearPayments', async () => {
  return paymentService.clearPayments();
});

ipcMain.handle('checkout:finalizeSale', async (event, customer, gstEnabled) => {
  return checkoutService.finalizeSale(customer, gstEnabled);
});

ipcMain.handle('backup:backupDatabase', async () => {
  return backupService.backupDatabase();
});

ipcMain.handle('backup:getBackupStats', async () => {
  return backupService.getBackupStats();
});

ipcMain.handle('backup:exportToExcel', async () => {
  return backupService.exportToExcel();
});

ipcMain.handle('print:printReceipt', async (event, html) => {
  return printService.printReceipt(html);
});

ipcMain.handle('receipt:generateHTML', async (event, saleData) => {
  return receiptService.generateReceiptHTML(saleData);
});
ipcMain.handle('get-debts', async () => {
  const debtService = require('./services/debtService');
  return debtService.getAllDebts();
});

ipcMain.handle('pay-debt', async (_event, data) => {
  const debtService = require('./services/debtService');
  return debtService.applyDebtPayment(data.debt_id, data.payment);
});

// Inventory Handlers
ipcMain.handle('inventory:getAll', async () => {
  return inventoryService.getAllProducts();
});

ipcMain.handle('inventory:sync', async () => {
  return inventoryService.syncExternalStock();
});

// Customer Handlers
ipcMain.handle('customers:getAll', async () => {
  return customerService.getAllCustomers();
});

ipcMain.handle('customers:add', async (_event, data) => {
  return customerService.addCustomer(data);
});

// Report Handlers
ipcMain.handle('reports:getBills', async () => {
  return reportService.getAllBills();
});

// Auth Handlers
ipcMain.handle('auth:sendOTP', async (event, email) => {
    return authService.sendOTP(email);
});

ipcMain.handle('auth:verifyOTP', async (event, email, otp) => {
    return authService.verifyOTP(email, otp);
});

ipcMain.handle('auth:register', async (event, email) => {
    return authService.register(email);
});
