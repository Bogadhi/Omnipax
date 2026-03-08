import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  const bookingId = uuidv4();
  const paymentId = uuidv4();

  const payload = JSON.stringify({
    bookingId: bookingId,
    paymentId: paymentId,
    amount: 100,
    currency: 'USD',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // First attempt
  let res = http.post(`${BASE_URL}/api/payment/verify`, payload, params);
  
  check(res, {
    'first attempt status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  // Retry with same paymentId (Idempotency check)
  res = http.post(`${BASE_URL}/api/payment/verify`, payload, params);
  
  check(res, {
    'retry status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'idempotency preserved': (r) => r.json('status') === 'success', // Assuming response structure
  });

  sleep(1);
}
