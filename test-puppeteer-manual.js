// Manual test script for Puppeteer screenshot functionality
const fetch = require('node-fetch');

async function testPuppeteerScreenshot() {
  console.log('🧪 Testing Puppeteer screenshot manually...');
  
  try {
    // First, let's try to login to get a valid session
    console.log('🔐 Attempting login...');
    
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'student@lab.com',
        password: 'student123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('🔐 Login response:', loginData);
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Got cookies:', cookies);
    
    // Now test the screenshot endpoint
    console.log('📸 Testing screenshot capture...');
    
    const screenshotResponse = await fetch('http://localhost:3000/api/capture-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        subject: 'JavaScript',
        containerUrl: 'http://localhost:8081' // Default student container URL
      })
    });
    
    const screenshotData = await screenshotResponse.text();
    console.log('📸 Screenshot response status:', screenshotResponse.status);
    console.log('📸 Screenshot response:', screenshotData.substring(0, 500) + '...');
    
    if (screenshotResponse.ok) {
      console.log('✅ Screenshot capture successful!');
      
      // Try to parse as JSON if possible
      try {
        const jsonData = JSON.parse(screenshotData);
        console.log('📊 Screenshot result:', {
          success: jsonData.success,
          message: jsonData.message,
          imageSize: jsonData.imageSize,
          filename: jsonData.filename
        });
      } catch (e) {
        console.log('📄 Response is not JSON, likely error message');
      }
    } else {
      console.error('❌ Screenshot capture failed');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testPuppeteerScreenshot()
  .then(() => {
    console.log('🏁 Manual test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test script error:', error);
    process.exit(1);
  });
