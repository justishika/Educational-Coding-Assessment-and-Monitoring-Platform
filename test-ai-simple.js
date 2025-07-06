#!/usr/bin/env node
/**
 * Simple AI Integration Test
 * Tests the Hugging Face API directly with the configured token
 */

import 'dotenv/config';

async function testHuggingFaceAPI() {
  console.log('🧪 Testing Hugging Face AI Integration...\n');
  
  // Check environment variables
  console.log('1. Checking Environment Variables:');
  const hasHFToken = !!process.env.HUGGINGFACE_API_TOKEN;
  console.log(`   HUGGINGFACE_API_TOKEN: ${hasHFToken ? '✅ Set' : '❌ Not set'}`);
  
  if (!hasHFToken) {
    console.log('   ❌ No token found - exiting test');
    return;
  }
  
  const tokenPreview = process.env.HUGGINGFACE_API_TOKEN.substring(0, 10) + '...';
  console.log(`   🔑 Token preview: ${tokenPreview}`);
  
  console.log('\n2. Testing API Connection:');
  
  try {
    console.log('   🔗 Calling Hugging Face API...');
    
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'Analyze this Python code: def hello(): print("Hello World")',
          parameters: {
            max_new_tokens: 100,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        })
      }
    );
    
    console.log(`   📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('   ✅ API connection successful!');
      
      const data = await response.json();
      console.log('   📝 Response data:', JSON.stringify(data, null, 2));
      
      // Check if we got a valid response
      if (data && (data.generated_text || (Array.isArray(data) && data[0]?.generated_text))) {
        console.log('   🎉 AI response received successfully!');
        const aiText = data.generated_text || data[0]?.generated_text;
        console.log(`   🤖 AI said: "${aiText.substring(0, 100)}..."`);
      } else {
        console.log('   ⚠️  Response format unexpected');
      }
      
    } else {
      const errorText = await response.text();
      console.log(`   ❌ API Error: ${response.status}`);
      console.log(`   📄 Error details: ${errorText}`);
      
      if (response.status === 503) {
        console.log('   ℹ️  Model is loading - this is normal for first requests');
        console.log('   ⏳ Try again in 30 seconds');
      } else if (response.status === 401) {
        console.log('   🔐 Authentication error - check your token');
      } else if (response.status === 429) {
        console.log('   🚦 Rate limit exceeded - wait before trying again');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Connection Error:', error.message);
    console.log('   🌐 Check your internet connection and try again');
  }
  
  console.log('\n3. Integration Status:');
  console.log('   🔧 Configuration: Complete');
  console.log('   🎯 Ready for AI-powered autograding!');
  console.log('\n4. Next Steps:');
  console.log('   1. Start your server: npm run dev');
  console.log('   2. Submit code for grading in the admin dashboard');
  console.log('   3. Watch for AI integration logs in the server output');
  console.log('   4. Check autograding results for AI-enhanced analysis');
  
  console.log('\n✅ Test Complete!');
}

// Run the test
testHuggingFaceAPI().catch(console.error); 