const Waza      = require("../models/Waza");
const Customer  = require("../models/Customer");
const { signToken } = require("../middleware/auth");
const logger    = require("../utils/logger");

function sendToken(res, user, role, code=200) {
  const token = signToken(user._id, role);
  const data  = user.toObject ? user.toObject() : user;
  delete data.password;
  res.status(code).json({ success:true, token, role, data });
}

exports.registerWaza = async (req, res) => {
  try {
    const { name, phone, password, district, zone, experience, capacity, minPlate, maxPlate, bio, specialty, color, lat, lng } = req.body;
    if (await Waza.findOne({ phone })) return res.status(409).json({ success:false, message:"Phone number already registered as a Waza" });
    const waza = await Waza.create({
      name, phone, password, district, zone, bio, specialty, color,
      experience: experience ? Number(experience) : undefined,
      capacity:   capacity   ? Number(capacity)   : undefined,
      minPlate:   minPlate   ? Number(minPlate)   : undefined,
      maxPlate:   maxPlate   ? Number(maxPlate)   : undefined,
      ...(lat && lng && { location:{ type:"Point", coordinates:[parseFloat(lng),parseFloat(lat)] } }),
    });
    logger.info(`New Waza: ${name} (${phone})`);
    sendToken(res, waza, "waza", 201);
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.loginWaza = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const waza = await Waza.findOne({ phone }).select("+password");
    if (!waza || !(await waza.comparePassword(password))) return res.status(401).json({ success:false, message:"Invalid phone or password" });
    if (!waza.isActive) return res.status(403).json({ success:false, message:"Account deactivated" });
    sendToken(res, waza, "waza");
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.registerCustomer = async (req, res) => {
  try {
    const { name, phone, password, email, district, zone, lat, lng } = req.body;
    if (await Customer.findOne({ phone })) return res.status(409).json({ success:false, message:"Phone number already registered" });
    const customer = await Customer.create({
      name, phone, password, email, district, zone,
      ...(lat && lng && { location:{ type:"Point", coordinates:[parseFloat(lng),parseFloat(lat)] } }),
    });
    logger.info(`New Customer: ${name} (${phone})`);
    sendToken(res, customer, "customer", 201);
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const customer = await Customer.findOne({ phone }).select("+password");
    if (!customer || !(await customer.comparePassword(password))) return res.status(401).json({ success:false, message:"Invalid phone or password" });
    if (!customer.isActive) return res.status(403).json({ success:false, message:"Account deactivated" });
    sendToken(res, customer, "customer");
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getMe = (req, res) => res.json({ success:true, role:req.role, data:req.user });