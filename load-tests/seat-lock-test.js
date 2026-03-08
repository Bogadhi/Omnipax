import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 500 },  // Ramp up to 500 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'], // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  const showId = 1; // Assume show ID 1 exists
  const seatId = randomIntBetween(1, 100); // Random seat between 1 and 100

  const payload = JSON.stringify({
    showId: showId,
    seatId: seatId,
    userId: `user-${__VU}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/bookings/lock`, payload, params);

  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    'latency is low': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
