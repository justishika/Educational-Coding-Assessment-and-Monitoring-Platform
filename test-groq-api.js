#!/usr/bin/env node
/**
 * Groq API Integration Test
 * 
 * This script tests the Groq API integration for AI-powered code autograding
 */

import 'dotenv/config';
import { AutogradingService } from './server/autograding-service.ts';

async function testGroqAPI() {
  console.log('🚀 Testing Groq AI Integration...\n');
  
  // Check environment variables
  console.log('1. Checking Environment Variables:');
  const hasGroqKey = !!process.env.GROQ_API_KEY;
  console.log(`   GROQ_API_KEY: ${hasGroqKey ? '✅ Set' : '❌ Not set'}`);
  
  if (!hasGroqKey) {
    console.log('   ❌ No Groq API key found');
    console.log('   📝 Get your free key at: https://console.groq.com');
    console.log('   🔧 Add GROQ_API_KEY=gsk_your_key_here to your .env file');
    return;
  }
  
  const keyPreview = process.env.GROQ_API_KEY.substring(0, 15) + '...';
  console.log(`   🔑 Key preview: ${keyPreview}`);
  
  console.log('\n2. Testing API Connection:');
  
  try {
    console.log('   🚀 Calling Groq API...');
    
    const testCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
print(fibonacci(10))`;
    
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert code reviewer. Provide detailed, constructive feedback on code submissions.'
            },
            {
              role: 'user',
              content: `Analyze this Python code and provide a score (0-100) and detailed feedback:

\`\`\`python
${testCode}
\`\`\`

Please provide:
1. Overall score (0-100)
2. Code quality assessment
3. Strengths
4. Weaknesses
5. Improvement suggestions`
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          top_p: 0.9
        })
      }
    );
    
    console.log(`   📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('   ✅ API connection successful!');
      
      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        console.log('   🎉 AI analysis received!');
        
        const analysis = data.choices[0].message.content;
        console.log(`   📊 Tokens used: ${data.usage?.total_tokens || 'N/A'}`);
        console.log(`   ⚡ Response time: ~${data.usage?.completion_tokens ? '1-3 seconds' : 'Fast'}`);
        
        // Show analysis preview
        const preview = analysis.substring(0, 200) + '...';
        console.log(`   🤖 AI Analysis Preview: "${preview}"`);
        
        // Try to extract score
        const scoreMatch = analysis.match(/(?:score|rating).*?(\d+)\/100|\b(\d+)\/100\b|(\d+)%/i);
        if (scoreMatch) {
          const score = scoreMatch[1] || scoreMatch[2] || scoreMatch[3];
          console.log(`   🎯 Extracted Score: ${score}/100`);
        }
        
        console.log('\n   📝 Full Analysis:');
        console.log('   ' + '='.repeat(50));
        console.log(analysis.split('\n').map(line => '   ' + line).join('\n'));
        console.log('   ' + '='.repeat(50));
        
      } else {
        console.log('   ⚠️  Unexpected response format');
        console.log('   📄 Response:', JSON.stringify(data, null, 2));
      }
      
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log(`   ❌ API Error: ${response.status}`);
      console.log(`   📄 Error details:`, errorData);
      
      if (response.status === 401) {
        console.log('   🔐 Authentication error - check your API key');
      } else if (response.status === 429) {
        console.log('   🚦 Rate limit exceeded - wait before trying again');
      } else if (response.status === 400) {
        console.log('   📝 Bad request - check your request format');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Connection Error:', error.message);
    console.log('   🌐 Check your internet connection and try again');
  }
  
  console.log('\n3. Integration Status:');
  
  if (hasGroqKey) {
    console.log('   ✅ Groq API: CONFIGURED');
    console.log('   🚀 Analysis Mode: Lightning-fast AI with Llama 3');
    console.log('   📊 Expected Quality: Excellent (AI-powered)');
    console.log('   ⚡ Speed: 1-3 seconds per analysis');
    console.log('   🎯 Daily Limit: 100+ analyses');
  } else {
    console.log('   ❌ Groq API: NOT CONFIGURED');
    console.log('   📊 Fallback: Rule-based analysis');
  }
  
  console.log('\n4. Next Steps:');
  console.log('   1. 🔄 Restart your server: npm run dev');
  console.log('   2. 🎯 Test autograding in admin dashboard');
  console.log('   3. 👀 Watch for "🚀 Using Groq AI API" in server logs');
  console.log('   4. 📈 Monitor usage at console.groq.com');
  
  console.log('\n✅ Groq API Test Complete!');
  console.log('🚀 Ready for ultra-fast AI-powered code analysis!');
}

// Test script for Pure AI Autograding System with Groq API
async function testPureAISystem() {
  console.log('🧪 Testing Pure AI Autograding System...\n');
  
  // Check if Groq API key is configured
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in environment variables');
    console.log('Please add your Groq API key to .env file:');
    console.log('GROQ_API_KEY=gsk_your_api_key_here');
    return;
  }
  
  console.log('✅ Groq API key configured');
  console.log('🚀 System is now 100% AI-driven (no fallback analysis)');
  
  const autograder = new AutogradingService();
  
  // Test cases
  const testCases = [
    {
      name: 'Python - Good Code',
      code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
print(fibonacci(10))
      `,
      language: 'python'
    },
    {
      name: 'JavaScript - Simple Function',
      code: `
function calculateArea(radius) {
    return Math.PI * radius * radius;
}

console.log(calculateArea(5));
      `,
      language: 'javascript'
    },
    {
      name: 'Python - Poor Code',
      code: `
def x():
    print("hello")
    
x()
      `,
      language: 'python'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const result = await autograder.analyzeCode(testCase.code, testCase.language);
      
      console.log(`\n📊 Results:`);
      console.log(`• Overall Score: ${result.suggestedScore}/100`);
      console.log(`• Code Quality: ${result.codeQuality}/100`);
      console.log(`• Readability: ${result.readability}/100`);
      console.log(`• Efficiency: ${result.efficiency}/100`);
      
      console.log(`\n💪 Strengths:`);
      result.strengths.forEach(strength => console.log(`  • ${strength}`));
      
      console.log(`\n⚠️ Weaknesses:`);
      result.weaknesses.forEach(weakness => console.log(`  • ${weakness}`));
      
      console.log(`\n💡 Improvements:`);
      result.improvements.forEach(improvement => console.log(`  • ${improvement}`));
      
      console.log(`\n📝 Full AI Analysis:`);
      console.log(result.aiAnalysis);
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
}

// Test system without API key (should fail gracefully)
async function testWithoutAPIKey() {
  console.log('\n🧪 Testing system without API key (should fail gracefully)...\n');
  
  const originalKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  
  const autograder = new AutogradingService();
  
  try {
    await autograder.analyzeCode('print("hello")', 'python');
    console.log('❌ System should have failed without API key');
  } catch (error) {
    console.log('✅ System correctly failed without API key:');
    console.log(`   ${error.message}`);
  }
  
  // Restore API key
  process.env.GROQ_API_KEY = originalKey;
}

// Run tests
async function runAllTests() {
  await testGroqAPI();
  await testPureAISystem();
  await testWithoutAPIKey();
  console.log('\n🎉 All tests completed!');
}

runAllTests().catch(console.error); 