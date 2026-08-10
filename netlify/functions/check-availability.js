const { getStore } = require('@netlify/blobs');
const { nextAvailableFriday } = require('./_shared');

exports.handler = async () => {
  const store = getStore('casework-bookings');
  const booked = (await store.get('booked-fridays', { type: 'json' })) || [];
  const date = nextAvailableFriday(booked);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, time: '13:00-14:00' }),
  };
};
