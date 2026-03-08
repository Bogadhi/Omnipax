import axios from 'axios';

const API_URL = 'http://localhost:5001';

async function run() {
  try {
    console.log('--- STARTING VERIFICATION ---');

    // 1. Sign Up / Login via OTP
    const email = `verify_${Date.now()}@test.com`;

    console.log('1. Requesting OTP for:', email);
    const otpRes = await axios.post(`${API_URL}/auth/otp/request`, { email });
    const otp = otpRes.data.otp;
    console.log('   OTP received:', otp);

    console.log('2. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, { email, otp });
    const token = loginRes.data.access_token;
    console.log('   Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get Events
    console.log('2. Fetching Events...');
    const eventsRes = await axios.get(`${API_URL}/events`);

    const events = eventsRes.data;
    if (events.length === 0) {
      console.error('No events found. Seeding specific seed?');
      return;
    }

    const event = events[0];
    const show = event.shows[0]; // Assuming structure
    if (!show) {
      console.error('No shows found for event');
      return;
    }

    // Find available seat
    const availableSeat = show.seatAvailability.find(
      (s: any) => s.status === 'AVAILABLE',
    );

    if (!availableSeat) {
      console.error('No available seats found in first show');
      return;
    }

    const seatId = availableSeat.seatId;
    const showId = show.id;

    console.log(`   Selected Show: ${showId}, Seat: ${seatId}`);

    // 3. Lock Seat
    console.log('3. Locking Seat...');
    await axios.post(
      `${API_URL}/shows/${showId}/lock-seats`,
      { seatIds: [seatId] },
      { headers },
    );
    // Note: Endpoint might be /shows/:id/lock-seats or /shows/:id/seats/lock.
    // I will adjust after grep search. Assuming /shows/:id/seats/lock based on standard REST practices or checking frontend.
    // Frontend seats.api.ts called: /shows/${showId}/seats/lock  <-- Wait, I need to verify this.

    // 4. Confirm Booking
    console.log('4. Confirming Booking...');
    const timestamp = Date.now();
    const confirmRes = await axios.post(
      `${API_URL}/bookings/confirm`,
      {
        showId,
        seatIds: [seatId],
        paymentDetails: {
          paymentId: `mock_payment_${timestamp}`,
          orderId: `mock_order_${timestamp}`,
          signature: `mock_sig_${timestamp}`,
        },
      },
      { headers },
    );

    console.log('   Booking Confirmed:', confirmRes.data.id);

    // 5. Get User Bookings
    console.log('5. Fetching User Bookings...');
    await axios.get(`${API_URL}/bookings/my-bookings`, { headers });

    console.log('--- VERIFICATION COMPLETE ---');
  } catch (error: any) {
    console.error('VERIFICATION FAILED:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

run();
