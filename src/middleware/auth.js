const jwt      = require("jsonwebtoken");
const Waza     = require("../models/Waza");
const Customer = require("../models/Customer");

function signToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ success:false, message:"Not authenticated" });
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    let user;
    if (decoded.role === "waza")     user = await Waza.findById(decoded.id).select("-password");
    if (decoded.role === "customer") user = await Customer.findById(decoded.id).select("-password");
    if (!user || !user.isActive) return res.status(401).json({ success:false, message:"Account not found" });
    req.user = user; req.role = decoded.role;
    next();
  } catch(e) {
    return res.status(401).json({ success:false, message:"Invalid or expired token" });
  }
}

const requireWaza     = (req,res,next) => req.role==="waza"     ? next() : res.status(403).json({ success:false, message:"Waza access required" });
const requireCustomer = (req,res,next) => req.role==="customer" ? next() : res.status(403).json({ success:false, message:"Customer access required" });

module.exports = { signToken, protect, requireWaza, requireCustomer };