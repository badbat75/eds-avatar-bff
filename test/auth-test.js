// JWT Token test script for BFF server
const http = require('http');
const jwt = require('jsonwebtoken');

// Mock JWT secret (should match your .env file)
const JWT_SECRET = 'your-super-secret-jwt-key-must-be-at-least-32-characters-long-for-security';

// Generate a test JWT token
function generateTestToken() {
  const payload = {
    sub: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    iss: 'eds-avatar-bff',
    aud: 'eds-avatar-frontend',
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

const testEndpoint = (path, method = 'GET', headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data ? JSON.parse(data) : null,
          headers: res.headers,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

async function runAuthTests() {
  console.log('🔐 Testing BFF Server Authentication...\n');

  try {
    // Generate test token
    const testToken = generateTestToken();
    console.log('✅ Generated test JWT token\n');

    // Test validate endpoint with valid token
    console.log('1. Testing validate endpoint with valid token...');
    const validateResult = await testEndpoint('/api/token/validate', 'GET', {
      'Authorization': `Bearer ${testToken}`
    });
    console.log(`   Status: ${validateResult.statusCode}`);
    console.log(`   Valid: ${validateResult.data?.valid}`);
    console.log(`   User: ${validateResult.data?.user?.email}\n`);

    // Test Deepgram 15-minute project token generation
    console.log('2. Testing Deepgram 15-minute project token generation...');
    const deepgramResult = await testEndpoint('/api/token/deepgram', 'POST', {
      'Authorization': `Bearer ${testToken}`
    }, {
      sessionId: 'test-session-123'
    });
    console.log(`   Status: ${deepgramResult.statusCode}`);

    if (deepgramResult.statusCode === 200) {
      console.log(`   15-minute project token generated successfully`);
      console.log(`   Expires in: ${deepgramResult.data?.expiresIn} seconds (${Math.floor(deepgramResult.data?.expiresIn / 60)} minutes)`);
    } else {
      console.log(`   Error: ${deepgramResult.data?.message}`);
      console.log('   💡 This is expected if DEEPGRAM_API_KEY is not set in .env');
    }

    console.log('\n✅ Authentication tests completed!\n');

    if (deepgramResult.statusCode !== 200) {
      console.log('📝 To test Deepgram integration:');
      console.log('   1. Add your real Deepgram API key to .env file');
      console.log('   2. Restart the server: npm run dev');
      console.log('   3. Run this test again');
    }

  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running: npm run dev');
    console.log('   2. JWT_SECRET in .env matches the one in this test');
  }
}

// Check if we can generate JWT tokens
console.log('🔍 Testing JWT token generation...');
try {
  const testToken = generateTestToken();
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ JWT token generation works');
  console.log(`   User: ${decoded.email}\n`);

  setTimeout(() => {
    runAuthTests();
  }, 1000);
} catch (error) {
  console.error('❌ JWT token generation failed:', error.message);
  console.log('💡 Make sure JWT_SECRET matches your .env file');
}