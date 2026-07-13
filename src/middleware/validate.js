const { body, param, validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success:false, message:"Validation failed", errors:errors.array().map(e=>({ field:e.path, msg:e.msg })) });
  next();
}

const wazaRegister = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("password").isLength({ min:6 }).withMessage("Password must be at least 6 characters"),
  body("district").notEmpty().withMessage("District is required"),
  body("zone").notEmpty().withMessage("Zone is required"),
  validate,
];

const customerRegister = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("password").isLength({ min:6 }).withMessage("Password must be at least 6 characters"),
  validate,
];

const login = [
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const createBooking = [
  body("wazaId").notEmpty().withMessage("Waza ID is required").isMongoId().withMessage("Invalid Waza ID"),
  body("startDate").notEmpty().isISO8601().withMessage("Valid start date required"),
  body("endDate").notEmpty().isISO8601().withMessage("Valid end date required"),
  body("guests").isInt({ min:1 }).withMessage("Guests must be at least 1"),
  validate,
];

const rescheduleBooking = [
  param("id").isMongoId(),
  body("startDate").notEmpty().isISO8601(),
  body("endDate").notEmpty().isISO8601(),
  validate,
];

const updateDates = [
  body("dates").isArray({ min:1 }).withMessage("dates must be a non-empty array"),
  validate,
];

const addReview = [
  param("id").isMongoId(),
  body("rating").isInt({ min:1, max:5 }).withMessage("Rating must be 1–5"),
  validate,
];

module.exports = { wazaRegister, customerRegister, login, createBooking, rescheduleBooking, updateDates, addReview };