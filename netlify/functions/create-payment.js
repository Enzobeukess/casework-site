const { getStore } = require('@netlify/blobs');
const { nextAvailableFriday, buildSignature, payfastHost } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const name_first = (body.name_first || '').trim();
  const name_last = (body.name_last || '').trim();
  const email_address = (body.email_address || '').trim();

  if (!name_first || !email_address) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and email are required' }) };
  }

  const store = getStore('casework-bookings');
  const booked = (await store.get('booked-fridays', { type: 'json' })) || [];
  const slotDate = nextAvailableFriday(booked);

  const siteUrl = process.env.URL || process.env.SITE_URL;
  const amount = process.env.PAYFAST_CONSULT_AMOUNT || '500.00'; // ZAR - set your real fee in Netlify env vars

  // Field order matters for the signature - keep this object's key order
  // identical to the order the hidden form fields are rendered in on the client.
  const fields = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: `${siteUrl}/booking-confirmed`,
    cancel_url: `${siteUrl}/booking-cancelled`,
    notify_url: `${siteUrl}/.netlify/functions/payfast-notify`,
    name_first,
    name_last,
    email_address,
    m_payment_id: `${slotDate}-${Date.now()}`,
    amount: Number(amount).toFixed(2),
    item_name: 'Consultation booking',
    item_description: `Consultation - Friday ${slotDate}, 13:00-14:00`,
    custom_str1: slotDate,
  };

  const signature = buildSignature(fields, process.env.PAYFAST_PASSPHRASE);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: payfastHost(),
      fields: { ...fields, signature },
    }),
  };
};
