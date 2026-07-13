const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const WazaSchema = new mongoose.Schema({
  name:         { type:String, required:true, trim:true },
  phone:        { type:String, required:true, unique:true, trim:true },
  password:     { type:String, required:true, minlength:6, select:false },
  district:     { type:String, required:true },
  zone:         { type:String, required:true },
  location:     { type:{ type:String, enum:["Point"], default:"Point" }, coordinates:{ type:[Number], default:[74.7973,34.0837] } },
  bio:          { type:String, maxlength:1000 },
  experience:   { type:Number },
  capacity:     { type:Number },
  minPlate:     { type:Number },
  maxPlate:     { type:Number },
  specialty:    { type:[String], default:[] },
  avatar:       { type:String, default:"" },
  color:        { type:String, default:"#B5451B" },
  available:    { type:Boolean, default:true },
  bookedDates:  { type:[String], default:[] },
  blockedDates: { type:[String], default:[] },
  rating:       { type:Number, default:0 },
  reviewCount:  { type:Number, default:0 },
  commissionRate: { type:Number, default:0.10 },
  isActive:     { type:Boolean, default:true },
}, { timestamps:true });

WazaSchema.index({ location:"2dsphere" });
WazaSchema.index({ district:1, available:1 });

WazaSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

WazaSchema.pre("save", function(next) {
  if (!this.avatar && this.name) {
    this.avatar = this.name.split(" ").slice(0,2).map(n=>n[0]?.toUpperCase()||"").join("");
  }
  next();
});

WazaSchema.virtual("priceRange").get(function() {
  if (this.minPlate && this.maxPlate) return `₹${this.minPlate}–₹${this.maxPlate}/plate`;
  return "Price on request";
});

WazaSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

WazaSchema.set("toJSON", { virtuals:true });
WazaSchema.set("toObject", { virtuals:true });

module.exports = mongoose.model("Waza", WazaSchema);