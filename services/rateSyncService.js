const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

// ── Rate schema ───────────────────────────────────────────────────────────
const rateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["gold", "silver"],
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const Rate = mongoose.models.Rate || mongoose.model('Rate', rateSchema);

async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB for Rates');
  } catch (err) {
    console.error('MongoDB connection error in rateSyncService:', err);
    throw new Error('Database connection failed.');
  }
}

async function fetchRatesFromMongo() {
  try {
    await connectDB();
    const goldRateObj = await Rate.findOne({ type: 'gold' });
    const silverRateObj = await Rate.findOne({ type: 'silver' });
    
    return {
      success: true,
      data: {
        gold: goldRateObj ? goldRateObj.rate : 0,
        silver: silverRateObj ? silverRateObj.rate : 0
      }
    };
  } catch (error) {
    console.error('Error fetching rates from MongoDB:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  fetchRatesFromMongo
};
