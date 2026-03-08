const http = require('http');

let token = '';
const headers = {
  'x-tenant-slug': 'starpass',
  'Content-Type': 'application/json'
};

function req(path, method = 'GET', body = null, useToken = true) {
  return new Promise((resolve) => {
    const reqHeaders = { ...headers };
    if (useToken && token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const opts = {
      hostname: '127.0.0.1',
      port: 5001,
      path: path,
      method: method,
      headers: reqHeaders
    };
    
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
           const json = JSON.parse(data);
           resolve({ status: res.statusCode, data: json });
        } catch(e) {
           resolve({ status: res.statusCode, data: data });
        }
      });
    });
    r.on('error', (e) => resolve({ status: 'ERROR', data: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const isSuperAdmin = process.argv.includes('--superadmin');
const email = isSuperAdmin ? 'super@example.com' : 'admin@example.com';
const password = isSuperAdmin ? 'super123' : 'admin123';

console.log(`Testing as ${isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'} (${email})`);

async function testAll() {
  console.log('--- TRIGGER OTP ---');
  let otpReq = await req('/auth/otp/request', 'POST', { email }, false);
  console.log('OTP Requested:', otpReq.status);
  
  await new Promise(r => setTimeout(r, 3000));
  const { execSync } = require('child_process');
  const tail = execSync(`powershell -Command "Get-Content debug.log -Tail 20 | Select-String 'OTP for ${email}'"`).toString();
  const matches = [...tail.matchAll(new RegExp(`OTP for ${email}:\\s*(\\d+)`, 'g'))];
  if (!matches || matches.length === 0) { console.error('OTP not found in log tail:', tail); return; }
  const otp = matches[matches.length - 1][1];
  console.log('Found OTP:', otp);
 
  console.log('\n--- LOGIN ---');
  let loginRes = await req('/auth/login', 'POST', { email, otp }, false);
  if (loginRes.data && loginRes.data.access_token) {
     token = loginRes.data.access_token;
     console.log('LOGIN SUCCESS', 'ROLE:', loginRes.data.user?.role);
  } else {
     console.log('LOGIN FAILED:', loginRes);
     return;
  }

  console.log('\n--- GET ADMIN SUMMARY ---');
  let s = await req('/admin/summary');
  console.log(s.status, JSON.stringify(s.data, null, 2));

  console.log('\n--- GET EVENTS ---');
  let e = await req('/events');
  console.log(e.status, JSON.stringify(e.data, null, 2));

  console.log('\n--- GET ADMIN EVENTS ---');
  let ae = await req('/admin/events');
  console.log(ae.status, JSON.stringify(ae.data, null, 2));

  console.log('\n--- GET SHOWS ---');
  let sh = await req('/admin/shows');
  console.log(sh.status, JSON.stringify(sh.data, null, 2));

  console.log('\n--- CREATE EVENT ---');
  const newEvt = {
    title: "E2E Test Concert 2026",
    type: "CONCERT",
    language: "English",
    duration: 120,
    price: 1000,
    date: "2026-12-01T20:00:00.000Z",
    location: "Mumbai",
    description: "Test concert",
    totalSeats: 100
  };
  let ce = await req('/admin/events', 'POST', newEvt);
  console.log(ce.status, JSON.stringify(ce.data, null, 2));

  if (ce.status === 201 && ce.data && ce.data.id) {
    console.log('\n--- GET THEATERS ---');
    let th = await req('/admin/theaters');
    console.log(th.status, JSON.stringify(th.data, null, 2));

    let screenId = th.data[0]?.screens[0]?.id;
    if (screenId) {
       console.log('\n--- CREATE SHOW ---');
       const newShow = {
         eventId: ce.data.id,
         screenId: screenId,
         startTime: "2026-12-01T20:00:00.000Z",
         basePrice: 1500
       };
       let cs = await req('/admin/shows', 'POST', newShow);
       console.log(cs.status, JSON.stringify(cs.data, null, 2));

       console.log('\n--- GET SHOWS AFTER CREATION ---');
       let sha = await req('/admin/shows');
       console.log(sha.status, JSON.stringify(sha.data, null, 2));

       console.log('\n--- GET PUBLIC EVENTS ---');
       let pEvt = await req('/events');
       console.log(pEvt.status, JSON.stringify(pEvt.data, null, 2));
       
       console.log('\n--- GET PUBLIC SHOWS FOR EVENT ---');
       let pShows = await req(`/events/${ce.data.id}/shows`);
       console.log(pShows.status, JSON.stringify(pShows.data, null, 2));

       if (cs.status === 201 && cs.data && cs.data.id) {
          console.log('\n--- GET SEAT MAP (PUBLIC) ---');
          let seatMap = await req(`/shows/${cs.data.id}/seats`);
          console.log(seatMap.status, seatMap.data ? `Seats returned: ${seatMap.data.length}` : 'Failed');
          
          let j12Seat = seatMap.data?.find(s => (s.seat.row === 'J' && s.seat.number === 12) || (s.seat.row === 'A' && s.seat.number === 1));
          let seatNumberToLock = j12Seat ? `${j12Seat.seat.row}${j12Seat.seat.number}` : 'A1';

          console.log('\n--- LOCK SEATS ---');
          let lockRes = await req('/bookings/lock', 'POST', {
            showId: cs.data.id,
            seatNumbers: [seatNumberToLock]
          });
          console.log(lockRes.status, JSON.stringify(lockRes.data, null, 2));

          if (lockRes.status === 201 && lockRes.data && lockRes.data.bookingId) {
             console.log('\n--- GET BOOKING DETAILS ---');
             let bOk = await req(`/bookings/${lockRes.data.bookingId}`);
             console.log(bOk.status, JSON.stringify(bOk.data, null, 2));
             
             console.log('\n--- MY BOOKINGS ---');
             let myB = await req('/bookings/my-bookings');
             console.log(myB.status, `Count: ${myB.data.length}`);

             if (lockRes.data.razorpayOrderId) {
                console.log('\n--- CONFIRM PAYMENT (SIMULATED) ---');
                const razorpayOrderId = lockRes.data.razorpayOrderId;
                const razorpayPaymentId = "pay_test_" + Math.random().toString(36).substring(7);
                const secret = "Bi6ccnT8akx61M2sMWenX4Fk"; 
                const crypto = require('crypto');
                const signature = crypto
                  .createHmac('sha256', secret)
                  .update(razorpayOrderId + '|' + razorpayPaymentId)
                  .digest('hex');

                let confRes = await req('/bookings/confirm', 'POST', {
                  bookingId: lockRes.data.bookingId,
                  razorpayOrderId,
                  razorpayPaymentId,
                  razorpaySignature: signature
                });
                console.log(confRes.status, JSON.stringify(confRes.data, null, 2));

                if (confRes.status === 201 || confRes.status === 200 || confRes.status === 204) {
                   console.log('\n--- VERIFY FINAL BOOKING ---');
                   let bFinal = await req(`/bookings/${lockRes.data.bookingId}`);
                   console.log(bFinal.status, "Status:", bFinal.data.status);
                   if (bFinal.data.status === 'CONFIRMED') {
                      console.log('STAGES 8 & 9 PASSED: Booking is CONFIRMED');
                      console.log('STAGE 10 PASSED: QR Token exists:', !!bFinal.data.qrToken);
                   }
                }
             }
          }
       }
    } else {
       console.log('Skipping create show, no screen found');
    }
  }
}

testAll();
