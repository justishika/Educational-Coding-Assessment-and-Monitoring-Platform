// Test the Puppeteer screenshot fixes by creating a temporary test file
import fetch from 'node-fetch';

async function testScreenshotFix() {
  console.log('🧪 Testing Puppeteer screenshot with backend fixes...');
  
  try {
    // Create a simple test by calling the API endpoint
    const response = await fetch('http://localhost:3000/api/debug/capture-screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test' // This might be bypassed for debug endpoint
      },
      body: JSON.stringify({
        subject: 'manual-test',
        containerUrl: 'https://vscode.dev'
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', result);
    
    if (result.success) {
      console.log('✅ SUCCESS: Backend fixes are working!');
      console.log(`📁 Image Size: ${result.imageSize}KB`);
    } else {
      console.log('❌ FAILED:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  }
}

testScreenshotFix();
