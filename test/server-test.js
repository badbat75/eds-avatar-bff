// Simple test script to verify BFF server functionality
const http = require('http');

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

async function runTests() {
  console.log('🧪 Testing EDS Avatar BFF Server...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await testEndpoint('/api/health');
    console.log(`   Status: ${health.statusCode}`);
    console.log(`   Service: ${health.data?.service}`);
    console.log(`   Status: ${health.data?.status}\n`);

    // Test root endpoint
    console.log('2. Testing root endpoint...');
    const root = await testEndpoint('/');
    console.log(`   Status: ${root.statusCode}`);
    console.log(`   Service: ${root.data?.service}\n`);

    // Test readiness endpoint
    console.log('3. Testing readiness endpoint...');
    const ready = await testEndpoint('/api/health/ready');
    console.log(`   Status: ${ready.statusCode}`);
    console.log(`   Ready: ${ready.data?.status}\n`);

    // Test protected endpoint (should fail without auth)
    console.log('4. Testing protected endpoint (should fail)...');
    const tokenEndpoint = await testEndpoint('/api/token/deepgram', 'POST');
    console.log(`   Status: ${tokenEndpoint.statusCode}`);
    console.log(`   Error: ${tokenEndpoint.data?.message}\n`);

    // Test validate endpoint (should fail without auth)
    console.log('5. Testing validate endpoint (should fail)...');
    const validateEndpoint = await testEndpoint('/api/token/validate');
    console.log(`   Status: ${validateEndpoint.statusCode}`);
    console.log(`   Error: ${validateEndpoint.data?.message}\n`);

    // Test 404 endpoint
    console.log('6. Testing 404 endpoint...');
    const notFound = await testEndpoint('/api/nonexistent');
    console.log(`   Status: ${notFound.statusCode}`);
    console.log(`   Error: ${notFound.data?.message}\n`);

    console.log('✅ Basic tests completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Add your Deepgram API key to .env file');
    console.log('   2. Create JWT tokens for authentication');
    console.log('   3. Test the Deepgram token generation endpoint with valid auth');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
    console.log('💡 Server should be available at http://localhost:3001');
  }
}

// Check if server is running first
console.log('🔍 Checking if server is running...');
setTimeout(() => {
  runTests();
}, 1000);