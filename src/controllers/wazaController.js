const Waza    = require("../models/Waza");
const Booking = require("../models/Booking");
const logger  = require("../utils/logger");

exports.getAllWazas = async (req, res) => {
  try {
    const { district, specialty, available, search, lat, lng, radius=50, page=1, limit=20 } = req.query;
    const filter = { isActive:true };
    if (district)              filter.district  = district;
    if (specialty)             filter.specialty = { $in: specialty.split(",") };
    if (available !== undefined) filter.available = available === "true";
    if (search) filter.$or = [{ name:{$regex:search,$options:"i"} },{ district:{$regex:search,$options:"i"} },{ zone:{$regex:search,$options:"i"} }];

    let query;
    if (lat && lng) {
      query = Waza.find({ ...filter, location:{ $near:{ $geometry:{ type:"Point", coordinates:[parseFloat(lng),parseFloat(lat)] }, $maxDistance:parseFloat(radius)*1000 } } });
    } else {
      query = Waza.find(filter).sort({ rating:-1, createdAt:-1 });
    }
    const skip  = (Number(page)-1)*Number(limit);
    const total = await Waza.countDocuments(filter);
    const wazas = await query.select("-password -blockedDates -bookedDates").skip(skip).limit(Number(limit));
    res.json({ success:true, total, page:Number(page), data:wazas });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getWazaById = async (req, res) => {
  try {
    const waza = await Waza.findById(req.params.id).select("-password");
    if (!waza) return res.status(404).json({ success:false, message:"Waza not found" });
    res.json({ success:true, data:waza });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getAvailability = async (req, res) => {
  try {
    const waza = await Waza.findById(req.params.id).select("bookedDates blockedDates available");
    if (!waza) return res.status(404).json({ success:false, message:"Waza not found" });
    res.json({ success:true, data:{ available:waza.available, bookedDates:waza.bookedDates, blockedDates:waza.blockedDates } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["bio","experience","capacity","minPlate","maxPlate","specialty","color","district","zone"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.body.lat && req.body.lng) updates.location = { type:"Point", coordinates:[parseFloat(req.body.lng),parseFloat(req.body.lat)] };
    const waza = await Waza.findByIdAndUpdate(req.user._id, updates, { new:true, runValidators:true }).select("-password");
    res.json({ success:true, data:waza });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const waza = await Waza.findById(req.user._id);
    waza.available = !waza.available;
    await waza.save();
    res.json({ success:true, available:waza.available });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.blockDates = async (req, res) => {
  try {
    const { dates } = req.body;
    const waza = await Waza.findById(req.user._id);
    waza.blockedDates = Array.from(new Set([...waza.blockedDates, ...dates]));
    await waza.save();
    res.json({ success:true, blockedDates:waza.blockedDates });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.unblockDates = async (req, res) => {
  try {
    const { dates } = req.body;
    const waza = await Waza.findById(req.user._id);
    waza.blockedDates = waza.blockedDates.filter(d => !dates.includes(d));
    await waza.save();
    res.json({ success:true, blockedDates:waza.blockedDates });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getDashboard = async (req, res) => {
  try {
    const bookings  = await Booking.find({ waza:req.user._id }).populate("customer","name phone email district zone").sort({ createdAt:-1 });
    const accepted  = bookings.filter(b => b.status==="Accepted");
    const totalGross= accepted.reduce((a,b) => a+(b.grossAmount||0), 0);
    const totalComm = accepted.reduce((a,b) => a+(b.commissionAmount||0), 0);
    res.json({ success:true, data:{ totalBookings:bookings.length, pendingCount:bookings.filter(b=>b.status==="Requested").length, acceptedCount:accepted.length, totalGross, totalCommission:totalComm, netEarnings:totalGross-totalComm, bookings } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};