const Redis = require('ioredis');

async function test() {
  const redis = new Redis({ host: '127.0.0.1', port: 6379 });
  
  console.log('Testing Redis scanStream...');
  let activeLocks = 0;
  try {
    const stream = redis.scanStream({ match: 'seat_lock:*:*', count: 100 });
    
    // Add a safeguard
    let iterations = 0;
    for await (const batch of stream) {
      if (!Array.isArray(batch)) {
        console.log('Batch is not an array:', batch);
      } else {
        activeLocks += batch.length;
      }
      
      iterations++;
      if (iterations > 1000) {
         console.error('INFINITE LOOP DETECTED');
         break;
      }
    }
    console.log('scanStream complete. activeLocks:', activeLocks);
  } catch (err) {
    console.error('CRASH:', err);
  } finally {
    redis.disconnect();
  }
}

test();
