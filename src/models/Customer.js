const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const CustomerSchema = new mongoose.Schema({
  name:     { type:String, required:true, trim:true },
  phone:    { type:String, required:true, unique:true, trim:true },
  password: { type:String, required:true, minlength:6, select:false },
  email:    { type:String, trim:true, lowercase:true },
  district: { type:String },
  zone:     { type:String },
  location: { type:{ type:String, enum:["Point"], default:"Point" }, coordinates:{ type:[Number], default:[74.7973,34.0837] } },
  isActive: { type:Boolean, default:true },
}, { timestamps:true });

CustomerSchema.index({ location:"2dsphere" });

CustomerSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

CustomerSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("Customer", CustomerSchema);