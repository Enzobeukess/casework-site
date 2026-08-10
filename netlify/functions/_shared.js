const crypto = require('crypto');

// Finds the next Friday (YYYY-MM-DD) not already present in bookedDates.
// Slot is always 13:00-14:00 on that date.
function nextAvailableFriday(bookedDates) {
  const now = new Date();
  let d = new Date(now);
  const day = d.getDay(); // 0 = Sun, 5 = Fri
  let daysUntilFriday = (5 - day + 7) % 7;

  if (daysUntilFriday === 0) {
    // It's Friday today - if the 13:00-14:00 slot has already passed, roll to next week.
    const slotEnd = new Date(d);
    slotEnd.setHours(14, 0, 0, 0);
    if (now > slotEnd) daysUntilFriday = 7;
  }

  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(0, 0, 0, 0);

  let iso = d.toISOString().slice(0, 10);
  while (bookedDates.includes(iso)) {
    d.setDate(d.getDate() + 7);
    iso = d.toISOString().slice(0, 10);
  }
  return iso;
}

// Builds the PayFast MD5 signature. `fields` must be an object whose
// insertion order matches the order the same fields are posted to PayFast.
function buildSignature(fields, passphrase) {
  const paramString = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const full = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : paramString;

  return crypto.createHash('md5').update(full).digest('hex');
}

function payfastHost() {
  return process.env.PAYFAST_SANDBOX === 'false'
    ? 'https://www.payfast.co.za/eng/process'
    : 'https://sandbox.payfast.co.za/eng/process';
}

module.exports = { nextAvailableFriday, buildSignature, payfastHost };
