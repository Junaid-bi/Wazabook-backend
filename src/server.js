require("dotenv").config();
const express     = require("express");
const helmet      = require("helmet");
const cors        = require("cors");
const morgan      = require("morgan");
const rateLimit   = require("express-rate-limit");
const compression = require("compression");
const connectDB   = require("../config/db");
const routes      = require("./routes");
const logger      = require("./utils/logger");

connectDB();

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors({ origin:"*", credentials:true }));
app.use(express.json({ limit:"10kb" }));
app.use(express.urlencoded({ extended:true }));
app.use(morgan("dev"));

app.use("/api/auth", rateLimit({ windowMs:15*60*1000, max:20, message:{ success:false, message:"Too many requests" } }));
app.use("/api",      rateLimit({ windowMs:15*60*1000, max:100, message:{ success:false, message:"Too many requests" } }));

app.use("/api", routes);

app.use((req, res) => res.status(404).json({ success:false, message:`Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => { logger.error(err.message); res.status(500).json({ success:false, message:err.message }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`🚀 WazaBook API running on port ${PORT}`));

module.exports = app;