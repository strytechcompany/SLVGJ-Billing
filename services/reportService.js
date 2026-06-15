const db = require('../database/db');
const logger = require('./logger');

const reportService = {
    getAllBills: () => {
        try {
            return db.prepare(`SELECT * FROM bills ORDER BY bill_datetime DESC`).all();
        } catch (err) {
            logger.error('Error fetching bills for reports', { error: err.message });
            throw err;
        }
    }
};

module.exports = reportService;
