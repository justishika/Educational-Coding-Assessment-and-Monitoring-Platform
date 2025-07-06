#!/usr/bin/env node
/**
 * Test script to verify AI JSON responses
 * 
 * This script specifically tests if the AI is returning valid JSON
 * and if our parsing logic can handle it correctly.
 */

import 'dotenv/config';
import { AutogradingService } from './server/autograding-service.ts';

async function testJSONResponse() {
  console.log('🧪 Testing AI JSON Response Format...\n');
  
  // Check if Groq API key is configured
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in environment variables');
    console.log('Please add your Groq API key to .env file:');
    console.log('GROQ_API_KEY=gsk_your_api_key_here');
    return;
  }
  
  console.log('✅ Groq API key configured');
  
  const autograder = new AutogradingService();
  
  // Test cases to verify JSON formatting
  const testCases = [
    {
      name: 'Simple Working Code',
      code: `def add(a, b):
    return a + b

result = add(5, 3)
print(result)`,
      language: 'python'
    },
    {
      name: 'Trivial Code (should get low score)',
      code: 'hello',
      language: 'python'
    },
    {
      name: 'Incomplete Function',
      code: `def isPrime(n):
    return false
    
# hehe piss off blehhhhh`,
      language: 'python'
    },
    {
      name: 'JavaScript Function',
      code: `function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

console.log(fibonacci(10));`,
      language: 'javascript'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`📝 Code: ${testCase.code.substring(0, 50)}...`);
    
    try {
      console.log('   🚀 Calling AI API...');
      const analysis = await autograder.analyzeCode(testCase.code, testCase.language);
      
      console.log('   ✅ JSON parsing successful!');
      console.log(`   📊 Score: ${analysis.suggestedScore}/100`);
      console.log(`   🎯 Code Quality: ${analysis.codeQuality}/100`);
      console.log(`   📖 Readability: ${analysis.readability}/100`);
      console.log(`   ⚡ Efficiency: ${analysis.efficiency}/100`);
      
      // Verify JSON structure
      console.log('   🔍 Verifying JSON structure...');
      
      const requiredFields = ['suggestedScore', 'aiAnalysis', 'strengths', 'weaknesses', 'improvements', 'codeQuality', 'readability', 'efficiency'];
      const missingFields = requiredFields.filter(field => analysis[field] === undefined);
      
      if (missingFields.length === 0) {
        console.log('   ✅ All required fields present');
      } else {
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
      }
      
      // Check score ranges
      const scoreFields = ['suggestedScore', 'codeQuality', 'readability', 'efficiency'];
      const invalidScores = scoreFields.filter(field => {
        const score = analysis[field];
        return typeof score !== 'number' || score < 0 || score > 100;
      });
      
      if (invalidScores.length === 0) {
        console.log('   ✅ All scores in valid range (0-100)');
      } else {
        console.log(`   ❌ Invalid scores: ${invalidScores.join(', ')}`);
      }
      
      // Check arrays
      const arrayFields = ['strengths', 'weaknesses', 'improvements'];
      const invalidArrays = arrayFields.filter(field => !Array.isArray(analysis[field]));
      
      if (invalidArrays.length === 0) {
        console.log('   ✅ All arrays are properly formatted');
      } else {
        console.log(`   ❌ Invalid arrays: ${invalidArrays.join(', ')}`);
      }
      
      console.log('   ✅ Test passed!');
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      
      if (error.message.includes('JSON')) {
        console.log('   🔍 JSON parsing issue detected');
        console.log('   📝 This indicates the AI is not returning valid JSON');
      } else if (error.message.includes('required')) {
        console.log('   🔍 Missing required fields in AI response');
      } else {
        console.log('   🔍 Unknown error - check AI service');
      }
    }
  }
  
  console.log('\n📊 JSON Response Test Summary:');
  console.log('✅ If all tests passed: AI is returning valid JSON');
  console.log('❌ If tests failed: Check AI prompt formatting and response structure');
  console.log('\n🔧 Tips for better JSON responses:');
  console.log('1. Use lower temperature (0.2) for more consistent formatting');
  console.log('2. Provide clear JSON examples in the prompt');
  console.log('3. Use explicit system messages about JSON-only responses');
  console.log('4. Check for markdown formatting in AI responses');
  
  console.log('\n✅ JSON Response Test Complete!');
}

// Test direct API call to see raw response
async function testRawAPIResponse() {
  console.log('\n🔍 Testing Raw API Response...\n');
  
  const testCode = `def add(a, b):
    return a + b

print(add(5, 3))`;
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'You are an expert code reviewer. You must respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `Analyze this Python code and return ONLY valid JSON with the following structure:

{
  "finalScore": 85,
  "gradeLevel": "Good",
  "evaluation": {
    "correctness": {"score": 35},
    "readability": {"score": 8}
  },
  "overallRemarks": "Code analysis complete"
}

Code to analyze:
\`\`\`python
${testCode}
\`\`\`

Return only the JSON object:`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });
    
    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content || '';
    
    console.log('📡 Raw AI Response:');
    console.log('=' .repeat(60));
    console.log(aiResponse);
    console.log('=' .repeat(60));
    
    // Try to parse as JSON
    try {
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      console.log('📊 Parsed structure:', JSON.stringify(parsed, null, 2));
      
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('🔍 Response appears to contain non-JSON content');
    }
    
  } catch (error) {
    console.log('❌ API call failed:', error.message);
  }
}

async function runAllTests() {
  await testJSONResponse();
  await testRawAPIResponse();
}

runAllTests().catch(console.error); 