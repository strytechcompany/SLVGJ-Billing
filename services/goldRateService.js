const db = require('../database/db');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

// ── Constants ─────────────────────────────────────────────────────────
const CACHE_TTL     = 60 * 1000;  // 1 minute TTL
const HISTORY_LIMIT = 50;

// ════════════════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS
// ════════════════════════════════════════════════════════════════════════

const stmts = {
  latestRate: db.prepare(`
    SELECT * FROM gold_rate
     ORDER BY effective_date DESC
     LIMIT 1
  `),

  insertRate: db.prepare(`
    INSERT INTO gold_rate (id, rate_per_gram, effective_date)
    VALUES (@id, @rate_per_gram, @effective_date)
  `),

  allRates: db.prepare(`
    SELECT * FROM gold_rate
     ORDER BY effective_date DESC
     LIMIT ${HISTORY_LIMIT}
  `),
};

// ── Transactional insert (safe for future multi-step expansions) ──────
const insertRateTx = db.transaction((record) => {
  stmts.insertRate.run(record);
});

// ════════════════════════════════════════════════════════════════════════
//  IN-MEMORY CACHE
//  Avoids hitting the DB on every call when the same rate is active.
//  A TTL ensures external DB changes are picked up within 1 minute.
// ════════════════════════════════════════════════════════════════════════

let cachedRate = null;
let cacheTime  = 0;

// ════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════

/** Round to 2 decimal places. */
function round2(value) {
  return Math.round(value * 100) / 100;
}

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Validate that a given rate is a positive number.
 * Throws a descriptive error if invalid.
 *
 * @param {*} rate
 */
function validateGoldRate(rate) {
  if (rate === null || rate === undefined) {
    logger.error('Invalid gold rate input - missing rate', { rate });
    throw new Error('Gold rate is required.');
  }
  if (typeof rate !== 'number' || Number.isNaN(rate)) {
    logger.error('Invalid gold rate input - type error', { rate });
    throw new Error('Gold rate must be a valid number.');
  }
  if (rate <= 0) {
    logger.error('Invalid gold rate input - non-positive value', { rate });
    throw new Error('Gold rate must be greater than 0.');
  }
}

/**
 * Return the most recent gold rate (rate_per_gram).
 * Uses an in-memory cache; falls back to a DB lookup.
 *
 * @returns {number} rate_per_gram rounded to 2 decimals
 */
function getLatestGoldRate() {
  const now = Date.now();

  // Return cached value if still within TTL
  if (cachedRate !== null && (now - cacheTime) < CACHE_TTL) {
    return cachedRate;
  }

  const row = stmts.latestRate.get();

  if (!row) {
    throw new Error('No gold rate found. Please set a rate before billing.');
  }

  validateGoldRate(row.rate_per_gram);

  cachedRate = round2(row.rate_per_gram);
  cacheTime  = now;

  logger.debug('Gold rate cache refreshed from database', { rate: cachedRate });

  return cachedRate;
}

/**
 * Set a new gold rate.  Inserts a row into the gold_rate table and
 * updates the in-memory cache.
 *
 * @param {number} ratePerGram
 * @returns {object} the inserted record
 */
function setGoldRate(ratePerGram) {
  validateGoldRate(ratePerGram);

  const record = {
    id:             uuidv4(),
    rate_per_gram:  round2(ratePerGram),
    effective_date: new Date().toISOString(),
  };

  insertRateTx(record);

  // Update cache
  cachedRate = record.rate_per_gram;
  cacheTime  = Date.now();

  logger.info(`Gold rate updated`, { newRate: record.rate_per_gram });
  return Object.freeze({ ...record });
}

/**
 * Return all stored gold rate records (most recent first, max ${HISTORY_LIMIT}).
 *
 * @returns {Array}
 */
function getGoldRateHistory() {
  return stmts.allRates.all();
}

/**
 * Clear the in-memory cache.
 * Next call to getLatestGoldRate() will re-fetch from the DB.
 */
function clearCache() {
  cachedRate = null;
  cacheTime  = 0;
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  getLatestGoldRate,
  setGoldRate,
  getGoldRateHistory,
  validateGoldRate,
  clearCache,
};
