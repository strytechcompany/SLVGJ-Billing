const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  billing: {
    addToCart: (barcode) => ipcRenderer.invoke('billing:addToCart', barcode),
    addToCartManual: (productId, weight, sellingPrice) => ipcRenderer.invoke('billing:addToCartManual', productId, weight, sellingPrice),
    getCart: () => ipcRenderer.invoke('billing:getCart'),
    getCartTotal: () => ipcRenderer.invoke('billing:getCartTotal'),
    clearCart: () => ipcRenderer.invoke('billing:clearCart'),
    searchProducts: (query) => ipcRenderer.invoke('billing:searchProducts', query),
    removeFromCart: (index) => ipcRenderer.invoke('billing:removeFromCart', index),
    getProductByBarcode: (barcode) => ipcRenderer.invoke('billing:getProductByBarcode', barcode),
  },
  payment: {
    addPayment: (data, total) => ipcRenderer.invoke('payment:addPayment', data, total),
    getPayments: () => ipcRenderer.invoke('payment:getPayments'),
    getTotalPaid: () => ipcRenderer.invoke('payment:getTotalPaid'),
    calculateRemaining: (total) => ipcRenderer.invoke('payment:calculateRemaining', total),
    clearPayments: () => ipcRenderer.invoke('payment:clearPayments'),
  },
  checkout: {
    finalizeSale: (customer, gstEnabled) => ipcRenderer.invoke('checkout:finalizeSale', customer, gstEnabled),
  },
  print: {
    printReceipt: (html) => ipcRenderer.invoke('print:printReceipt', html),
  },
  backup: {
    backupDatabase: () => ipcRenderer.invoke('backup:backupDatabase'),
    getBackupStats: () => ipcRenderer.invoke('backup:getBackupStats'),
    exportToExcel: () => ipcRenderer.invoke('backup:exportToExcel'),
  },
  receipt: {
    generateHTML: (saleData) => ipcRenderer.invoke('receipt:generateHTML', saleData),
  },
  debts: {
    getDebts: () => ipcRenderer.invoke('get-debts'),
    applyDebtPayment: (debt_id, payment) => ipcRenderer.invoke('pay-debt', { debt_id, payment }),
  },
  auth: {
    sendOTP: (email) => ipcRenderer.invoke('auth:sendOTP', email),
    verifyOTP: (email, otp) => ipcRenderer.invoke('auth:verifyOTP', email, otp),
    register: (email) => ipcRenderer.invoke('auth:register', email),
  }
});
