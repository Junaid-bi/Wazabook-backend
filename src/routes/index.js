const express = require("express");
const router  = express.Router();
const auth    = require("../controllers/authController");
const waza    = require("../controllers/wazaController");
const booking = require("../controllers/bookingController");
const { protect, requireWaza, requireCustomer } = require("../middleware/auth");
const V = require("../middleware/validate");

router.get("/health", (req, res) => res.json({ success:true, status:"ok", timestamp:new Date().toISOString() }));

router.post("/auth/waza/register",     V.wazaRegister,     auth.registerWaza);
router.post("/auth/waza/login",        V.login,            auth.loginWaza);
router.post("/auth/customer/register", V.customerRegister, auth.registerCustomer);
router.post("/auth/customer/login",    V.login,            auth.loginCustomer);
router.get("/auth/me",                 protect,            auth.getMe);

// Wazas (public)
router.get("/wazas",                   waza.getAllWazas);

// Waza dashboard/profile/availability (protected) — MUST come before /:id routes
router.get("/wazas/dashboard",         protect, requireWaza, waza.getDashboard);
router.patch("/wazas/profile",         protect, requireWaza, waza.updateProfile);
router.patch("/wazas/availability",    protect, requireWaza, waza.toggleAvailability);
router.post("/wazas/block-dates",      protect, requireWaza, V.updateDates, waza.blockDates);
router.delete("/wazas/block-dates",    protect, requireWaza, V.updateDates, waza.unblockDates);

// Wildcard :id routes (public) — must come AFTER specific routes above
router.get("/wazas/:id/availability",  waza.getAvailability);
router.get("/wazas/:id",               waza.getWazaById);

router.post("/bookings",                 protect, requireCustomer, V.createBooking,      booking.createBooking);
router.get("/bookings/my",               protect, requireCustomer,                        booking.getMyBookings);
router.patch("/bookings/:id/cancel",     protect, requireCustomer,                        booking.cancelBooking);
router.patch("/bookings/:id/reschedule", protect, requireCustomer, V.rescheduleBooking,   booking.rescheduleBooking);
router.post("/bookings/:id/review",      protect, requireCustomer, V.addReview,           booking.addReview);
router.patch("/bookings/:id/accept",     protect, requireWaza,                            booking.acceptBooking);
router.patch("/bookings/:id/reject",     protect, requireWaza,                            booking.rejectBooking);
router.get("/bookings/:id",              protect,                                          booking.getBookingById);

module.exports = router;