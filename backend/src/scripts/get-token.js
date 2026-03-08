const axios = require('axios');

async function main() {
  try {
    // We'll try to find a user first or use the 'pay@test.com' we saw
    const loginRes = await axios.post('http://localhost:5001/auth/login', {
      email: 'pay@test.com',
      otp: '123456' // Assuming there's a dev bypass or we can find the OTP
    });
    console.log('Login Success. Token:', loginRes.data.token);
  } catch (err) {
    console.error('Login Failed:', err.response ? err.response.data : err.message);
  }
}

main();
