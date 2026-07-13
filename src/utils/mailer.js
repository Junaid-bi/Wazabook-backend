const nodemailer = require("nodemailer");
const logger     = require("./logger");

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.EMAIL_FROM || "WazaBook <noreply@wazabook.com>";
const fmt  = d => new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

async function sendBookingRequest(waza, customer, booking) {
  if (!process.env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: FROM, to: process.env.SMTP_USER,
      subject: `📨 New Booking Request — ${customer.name}`,
      html: `<h2>New Booking Request</h2><p>Customer: ${customer.name}</p><p>Phone: ${customer.phone}</p><p>Dates: ${fmt(booking.startDate)} → ${fmt(booking.endDate)}</p><p>Guests: ${booking.guests}</p><p>Occasion: ${booking.occasion}</p>`,
    });
  } catch (e) { logger.error(`Email failed: ${e.message}`); }
}

async function sendBookingAccepted(customer, waza, booking) {
  if (!customer.email || !process.env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: FROM, to: customer.email,
      subject: `✅ Booking Confirmed — ${waza.name}`,
      html: `<h2>Your Booking is Confirmed!</h2><p>Waza: ${waza.name}</p><p>Dates: ${fmt(booking.startDate)} → ${fmt(booking.endDate)}</p><p>Guests: ${booking.guests}</p>`,
    });
  } catch (e) { logger.error(`Email failed: ${e.message}`); }
}

async function sendBookingRejected(customer, booking) {
  if (!customer.email || !process.env.SMTP_USER) return;
  try {
    await transporter.sendMail({
      from: FROM, to: customer.email,
      subject: `❌ Booking Not Available`,
      html: `<h2>Booking Unavailable</h2><p>Unfortunately your booking was not accepted. Please browse other Wazas on WazaBook.</p>`,
    });
  } catch (e) { logger.error(`Email failed: ${e.message}`); }
}

module.exports = { sendBookingRequest, sendBookingAccepted, sendBookingRejected };