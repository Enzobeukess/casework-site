const { getStore } = require('@netlify/blobs');
const { buildSignature } = require('./_shared');

// PayFast posts application/x-www-form-urlencoded data here.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const params = new URLSearchParams(event.body || '');
  const data = Object.fromEntries(params.entries());
  const { signature, ...rest } = data;

  // 1. Verify the signature PayFast sent matches what we'd compute.
  const expected = buildSignature(rest, process.env.PAYFAST_PASSPHRASE);
  if (!signature || signature !== expected) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // 2. Only act on completed payments.
  if (data.payment_status !== 'COMPLETE') {
    return { statusCode: 200, body: 'Ignored - not complete' };
  }

  // 3. Lock the slot in.
  const slotDate = data.custom_str1;
  if (slotDate) {
    const store = getStore('casework-bookings');
    const booked = (await store.get('booked-fridays', { type: 'json' })) || [];
    if (!booked.includes(slotDate)) {
      booked.push(slotDate);
      await store.set('booked-fridays', JSON.stringify(booked));
    }
  }

  // Production hardening worth adding once you're live: verify the request
  // came from a PayFast IP, and post the received data back to PayFast's
  // validate endpoint to confirm authenticity before trusting it fully.
  // See: https://developers.payfast.co.za/docs#step_5_confirm_payment

  return { statusCode: 200, body: 'OK' };
};
