const db = require('../database/db');
const logger = require('./logger');

// ════════════════════════════════════════════════════════════════════════
//  IN-MEMORY CART
// ════════════════════════════════════════════════════════════════════════

let cart = [];

// ════════════════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS  (compiled once, reused on every call)
// ════════════════════════════════════════════════════════════════════════

const stmts = {
  productByBarcode: db.prepare(`
    SELECT * FROM products WHERE barcode = ?
  `),

  productById: db.prepare(`
    SELECT * FROM products WHERE product_id = ?
  `),

  searchProducts: db.prepare(`
    SELECT * FROM products
     WHERE name LIKE ? OR barcode LIKE ? OR product_id LIKE ? OR purity LIKE ?
     ORDER BY stock DESC, name ASC
     LIMIT 15
  `),
};

// ════════════════════════════════════════════════════════════════════════
//  SHARED CALCULATION HELPER
//  Both addToCart and addToCartManual funnel through this so the pricing
//  logic is never duplicated.
// ════════════════════════════════════════════════════════════════════════

/**
 * Calculate net weight, price, and total for a product.
 *
 * @param {object}  product       – product row from the DB
 * @param {number|null} customWeight – override for gross_weight (optional)
 * @returns {{ gross_weight, stone_weight, net_weight, price, making_charge, total }}
 */
function calculateItemPrice(product, customWeight = null) {
  const gross_weight  = customWeight ?? product.gross_weight ?? 0;
  const stone_weight  = product.stone_weight ?? 0;
  const price_per_gram = product.price_per_gram ?? 0;
  const making_charge  = product.making_charge ?? 0;

  // Prevent negative net weight
  const net_weight = Math.max(0, gross_weight - stone_weight);

  const price = net_weight * price_per_gram;
  const total = price + making_charge;

  return {
    gross_weight,
    stone_weight,
    net_weight,
    price,
    making_charge,
    total: Math.round(total * 100) / 100,   // round to 2 decimals
  };
}

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════

/**
 * Fetch a product by its barcode. Throws if not found or out of stock.
 */
function getProductByBarcode(barcode) {
  if (!barcode) throw new Error('Barcode is required.');

  const product = stmts.productByBarcode.get(barcode);

  if (!product) {
    logger.error('Product discovery failed - barcode not found', { barcode });
    throw new Error(`Product not found for barcode: ${barcode}`);
  }
  if (product.stock <= 0) {
    logger.warn('Attempted to add out-of-stock product', { barcode, productName: product.name });
    throw new Error(`Product "${product.name}" is out of stock.`);
  }

  return product;
}

/**
 * Fetch a product by its product_id. Throws if not found or out of stock.
 */
function getProductById(productId) {
  if (!productId) throw new Error('Product ID is required.');

  const product = stmts.productById.get(productId);

  if (!product) {
    logger.error('Product discovery failed - ID not found', { productId });
    throw new Error(`Product not found for ID: ${productId}`);
  }
  if (product.stock <= 0) {
    logger.warn('Attempted to add out-of-stock product', { productId, productName: product.name });
    throw new Error(`Product "${product.name}" is out of stock.`);
  }

  return product;
}

/**
 * Search products by name or barcode (partial match).
 * Returns up to 15 results.
 */
function searchProducts(query) {
  const pattern = `%${String(query).trim()}%`;
  const products = stmts.searchProducts.all(pattern, pattern, pattern, pattern);

  logger.debug('Product search performed', { query, resultsCount: products.length });

  return products;
}

/**
 * Add a product to the cart by scanning its barcode.
 */
function addToCart(barcode) {
  const product = getProductByBarcode(barcode);

  const calc = calculateItemPrice(product);

  const cartItem = {
    product_id:    product.product_id,
    name:          product.name,
    gross_weight:  calc.gross_weight,
    stone_weight:  calc.stone_weight,
    net_weight:    calc.net_weight,
    purity:        product.purity,
    rate:          product.price_per_gram,
    making_charge: calc.making_charge,
    total:         calc.total,
    buying_price:  product.buying_price,
    selling_price: calc.total,
  };

  cart.push(cartItem);

  logger.info('Item added to cart via barcode scan', { barcode, cartItem });

  return cartItem;
}

/**
 * Add a product to the cart manually by product_id.
 * Optionally override the gross weight (e.g. for loose / weighed items).
 */
function addToCartManual(productId, customWeight = null, sellingPrice = null) {
  const product = getProductById(productId);

  // Validate custom weight if provided
  if (customWeight !== null) {
    if (typeof customWeight !== 'number' || customWeight < 0) {
      throw new Error('Custom weight must be a non-negative number.');
    }
  }

  if (sellingPrice !== null && sellingPrice !== '') {
    const parsed = Number(sellingPrice);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error('Selling price must be a valid non-negative number.');
    }
    product.price_per_gram = parsed;
  }

  const calc = calculateItemPrice(product, customWeight);

  const cartItem = {
    product_id:    product.product_id,
    name:          product.name,
    gross_weight:  calc.gross_weight,
    stone_weight:  calc.stone_weight,
    net_weight:    calc.net_weight,
    purity:        product.purity,
    rate:          product.price_per_gram,
    making_charge: calc.making_charge,
    total:         calc.total,
    buying_price:  product.buying_price,
    selling_price: calc.total,
  };

  cart.push(cartItem);

  logger.info('Manual item added to cart', { productId, cartItem });

  return cartItem;
}

/**
 * Return all items currently in the cart.
 */
function getCart() {
  return cart;
}

/**
 * Return the sum of all item totals in the cart.
 */
function getCartTotal() {
  return Math.round(
    cart.reduce((sum, item) => sum + item.total, 0) * 100
  ) / 100;
}

/**
 * Remove an item from the cart by its index.
 */
function removeFromCart(index) {
  if (index < 0 || index >= cart.length) {
    logger.warn('Attempted to remove item with invalid index', { index, cartLength: cart.length });
    throw new Error('Invalid cart item index.');
  }

  const removedItem = cart.splice(index, 1)[0];
  logger.info('Item removed from cart', { index, removedItem });

  return removedItem;
}

/**
 * Reset the cart to an empty array.
 */
function clearCart() {
  cart = [];
}

// ════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════

module.exports = {
  getProductByBarcode,
  getProductById,
  searchProducts,
  addToCart,
  addToCartManual,
  getCart,
  getCartTotal,
  removeFromCart,
  clearCart,
};
