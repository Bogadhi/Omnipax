import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    flood: {
      executor: 'constant-arrival-rate',
      rate: 200, // 200 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  const res = http.get(`${BASE_URL}/api/events`);

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'rate limited correctly': (r) => r.status === 429,
  });
}
