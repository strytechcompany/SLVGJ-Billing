const db = require('../database/db');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

const customerService = {
    getAllCustomers: () => {
        try {
            return db.prepare(`SELECT * FROM customers ORDER BY created_at DESC`).all();
        } catch (err) {
            logger.error('Error fetching customers', { error: err.message });
            throw err;
        }
    },

    addCustomer: (data) => {
        try {
            const { name, phone, address } = data;
            
            if (!name || name.trim() === '') {
                throw new Error('Customer name is required.');
            }
            
            // Check for uniqueness
            const existing = db.prepare(`
                SELECT * FROM customers 
                WHERE LOWER(name) = LOWER(?) 
                   OR (phone IS NOT NULL AND phone != '' AND phone = ?)
            `).get(name.trim(), phone ? phone.trim() : '');
            
            if (existing) {
                if (existing.name.toLowerCase() === name.trim().toLowerCase()) {
                    throw new Error(`A customer with the name "${name}" already exists.`);
                }
                if (existing.phone && existing.phone === phone.trim()) {
                    throw new Error(`A customer with the phone number "${phone}" already exists.`);
                }
            }

            const customer_id = uuidv4();
            db.prepare(`
                INSERT INTO customers (customer_id, name, phone, address)
                VALUES (@customer_id, @name, @phone, @address)
            `).run({ 
                customer_id, 
                name: name.trim(), 
                phone: phone ? phone.trim() : null, 
                address: address ? address.trim() : null 
            });

            return { customer_id, name: name.trim(), phone: phone ? phone.trim() : null, address: address ? address.trim() : null };
        } catch (err) {
            logger.error('Error adding customer', { error: err.message });
            throw err;
        }
    }
};

module.exports = customerService;
