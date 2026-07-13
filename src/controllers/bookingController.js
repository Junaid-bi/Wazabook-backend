const Booking = require("../models/Booking");
const Waza    = require("../models/Waza");
const mailer  = require("../utils/mailer");
const logger  = require("../utils/logger");

const CANCEL_DAYS = 28;
const daysUntil   = d => Math.ceil((new Date(d) - new Date()) / 86400000);
const dateRange   = (s, e) => {
  const dates=[], cur=new Date(s), last=new Date(e);
  while(cur<=last){ dates.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }
  return dates;
};

exports.createBooking = async (req, res) => {
  try {
    const { wazaId, startDate, endDate, guests, occasion, specialRequests } = req.body;
    const waza = await Waza.findById(wazaId);
    if (!waza || !waza.isActive) return res.status(404).json({ success:false, message:"Waza not found" });
    if (!waza.available)         return res.status(400).json({ success:false, message:"This Waza is currently unavailable" });
    const reqDates = dateRange(startDate, endDate);
    if (reqDates.some(d => waza.bookedDates.includes(d) || waza.blockedDates.includes(d))) return res.status(409).json({ success:false, message:"Selected dates are not available" });
    const booking = await Booking.create({ customer:req.user._id, waza:wazaId, startDate:new Date(startDate), endDate:new Date(endDate), guests:Number(guests), occasion:occasion||"Wedding", specialRequests, district:waza.district, zone:waza.zone, plateRateMin:waza.minPlate, plateRateMax:waza.maxPlate, commissionRate:waza.commissionRate||0.10 });
    await Waza.findByIdAndUpdate(wazaId, { bookedDates:Array.from(new Set([...waza.bookedDates,...reqDates])) });
    mailer.sendBookingRequest(waza, req.user, booking).catch(()=>{});
    logger.info(`Booking created: ${booking._id}`);
    const populated = await Booking.findById(booking._id).populate("customer","name phone").populate("waza","name phone district zone color avatar");
    res.status(201).json({ success:true, data:populated });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("customer","name phone email").populate("waza","name phone");
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.waza._id.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:"Not your booking" });
    if (booking.status !== "Requested") return res.status(400).json({ success:false, message:"Cannot accept — booking is not in Requested state" });
    booking.status = "Accepted";
    await booking.save();
    mailer.sendBookingAccepted(booking.customer, booking.waza, booking).catch(()=>{});
    res.json({ success:true, message:"Booking accepted", data:booking });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("customer","name phone email");
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.waza.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:"Not your booking" });
    if (booking.status !== "Requested") return res.status(400).json({ success:false, message:"Cannot reject — booking is not in Requested state" });
    booking.status = "Rejected";
    booking.rejectionReason = req.body.reason || "";
    await booking.save();
    const toFree = dateRange(booking.startDate, booking.endDate);
    await Waza.findByIdAndUpdate(booking.waza, { $pull:{ bookedDates:{ $in:toFree } } });
    mailer.sendBookingRejected(booking.customer, booking).catch(()=>{});
    res.json({ success:true, message:"Booking rejected", data:booking });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.customer.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:"Not your booking" });
    if (["Cancelled","Rejected","Completed"].includes(booking.status)) return res.status(400).json({ success:false, message:"Cannot cancel in current state" });
    const days = daysUntil(booking.startDate);
    if (days < CANCEL_DAYS) return res.status(400).json({ success:false, message:`Cannot cancel — event is ${days} day${days!==1?"s":""} away. Need 28+ days notice.` });
    booking.status = "Cancelled";
    await booking.save();
    const toFree = dateRange(booking.startDate, booking.endDate);
    await Waza.findByIdAndUpdate(booking.waza, { $pull:{ bookedDates:{ $in:toFree } } });
    res.json({ success:true, message:"Booking cancelled", data:booking });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.rescheduleBooking = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.customer.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:"Not your booking" });
    if (["Cancelled","Rejected","Completed"].includes(booking.status)) return res.status(400).json({ success:false, message:"Cannot reschedule in current state" });
    const days = daysUntil(booking.startDate);
    if (days < CANCEL_DAYS) return res.status(400).json({ success:false, message:`Cannot reschedule — event is ${days} days away. Need 28+ days notice.` });
    const waza    = await Waza.findById(booking.waza);
    const newDates= dateRange(startDate, endDate);
    const oldDates= dateRange(booking.startDate, booking.endDate);
    if (newDates.filter(d=>!oldDates.includes(d)).some(d=>waza.bookedDates.includes(d)||waza.blockedDates.includes(d))) return res.status(409).json({ success:false, message:"New dates are not available" });
    booking.rescheduledFrom = { startDate:booking.startDate, endDate:booking.endDate };
    booking.startDate = new Date(startDate);
    booking.endDate   = new Date(endDate);
    booking.status    = "Rescheduled";
    await booking.save();
    const updatedDates = Array.from(new Set([...waza.bookedDates.filter(d=>!oldDates.includes(d)),...newDates]));
    await Waza.findByIdAndUpdate(booking.waza, { bookedDates:updatedDates });
    res.json({ success:true, message:"Booking rescheduled", data:booking });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer:req.user._id }).populate("waza","name phone district zone color avatar minPlate maxPlate").sort({ createdAt:-1 });
    res.json({ success:true, count:bookings.length, data:bookings });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("customer","name phone").populate("waza","name phone district zone");
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    const isOwner = booking.customer._id.toString()===req.user._id.toString() || booking.waza._id.toString()===req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success:false, message:"Access denied" });
    res.json({ success:true, data:booking });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.customer.toString() !== req.user._id.toString()) return res.status(403).json({ success:false, message:"Not your booking" });
    if (!["Accepted","Completed"].includes(booking.status)) return res.status(400).json({ success:false, message:"Can only review accepted bookings" });
    if (booking.review?.rating) return res.status(400).json({ success:false, message:"Already reviewed" });
    booking.review = { rating:Number(rating), comment, createdAt:new Date() };
    await booking.save();
    const all = await Booking.find({ waza:booking.waza, "review.rating":{ $exists:true } });
    const avg = all.reduce((s,b) => s+b.review.rating, 0) / all.length;
    await Waza.findByIdAndUpdate(booking.waza, { rating:Math.round(avg*10)/10, reviewCount:all.length });
    res.json({ success:true, message:"Review submitted", data:booking.review });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};