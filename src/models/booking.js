const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  customer:        { type:mongoose.Schema.Types.ObjectId, ref:"Customer", required:true },
  waza:            { type:mongoose.Schema.Types.ObjectId, ref:"Waza",     required:true },
  occasion:        { type:String, enum:["Wedding","Walima","Engagement","Aqeeqa","Mehndi","Other"], default:"Wedding" },
  guests:          { type:Number, required:true },
  specialRequests: { type:String, maxlength:1000 },
  startDate:       { type:Date, required:true },
  endDate:         { type:Date, required:true },
  durationDays:    { type:Number },
  district:        { type:String },
  zone:            { type:String },
  plateRateMin:    { type:Number },
  plateRateMax:    { type:Number },
  avgPlateRate:    { type:Number },
  grossAmount:     { type:Number },
  commissionRate:  { type:Number, default:0.10 },
  commissionAmount:{ type:Number },
  netAmount:       { type:Number },
  status:          { type:String, enum:["Requested","Accepted","Rejected","Cancelled","Rescheduled","Completed"], default:"Requested" },
  statusHistory:   [{ status:String, changedAt:{ type:Date, default:Date.now }, note:String }],
  rejectionReason: { type:String },
  rescheduledFrom: { startDate:Date, endDate:Date },
  review:          { rating:Number, comment:String, createdAt:Date },
}, { timestamps:true });

BookingSchema.index({ waza:1, status:1 });
BookingSchema.index({ customer:1, status:1 });

BookingSchema.pre("save", function(next) {
  if (this.startDate && this.endDate) {
    this.durationDays = Math.max(1, Math.round((this.endDate - this.startDate) / 86400000) + 1);
  }
  if (this.guests && this.plateRateMin && this.plateRateMax) {
    this.avgPlateRate       = (this.plateRateMin + this.plateRateMax) / 2;
    this.grossAmount        = this.guests * this.avgPlateRate * (this.durationDays || 1);
    this.commissionAmount   = this.grossAmount * (this.commissionRate || 0.10);
    this.netAmount          = this.grossAmount - this.commissionAmount;
  }
  if (this.isModified("status")) {
    this.statusHistory.push({ status:this.status, changedAt:new Date() });
  }
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);