const mongoose = require("mongoose");
const logger   = require("../src/utils/logger");

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    setTimeout(connectDB, 5000);
  }
}

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected. Reconnecting…");
  setTimeout(connectDB, 3000);
});

module.exports = connectDB;