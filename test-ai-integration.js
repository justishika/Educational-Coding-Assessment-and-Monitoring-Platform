#!/usr/bin/env node
/**
 * Test script for Hugging Face AI integration
 * 
 * This script tests the AI autograding functionality to ensure:
 * 1. Environment variables are loaded correctly
 * 2. Hugging Face API connection works
 * 3. AI analysis produces expected results
 * 4. Fallback to rule-based analysis works when needed
 */

import 'dotenv/config';
import { AutogradingService } from './server/autograding-service.js';

// Mock storage for testing
class MockStorage {
  async getSubmissionById(id) {
    return {
      id: id,
      userId: 1,
      code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")`,
      subject: 'python',
      createdAt: new Date()
    };
  }

  async getFileSubmissionsBySubmissionId(submissionId) {
    return []; // No file submissions for this test
  }

  async createAutograde(data) {
    console.log('📝 Mock autograde record created:', {
      ...data,
      strengths: JSON.parse(data.strengths),
      weaknesses: JSON.parse(data.weaknesses),
      improvements: JSON.parse(data.improvements)
    });
    return { id: 1, ...data };
  }
}

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...\n');
  
  // Check environment variables
  console.log('1. Checking Environment Variables:');
  const hasHFToken = !!process.env.HUGGINGFACE_API_TOKEN;
  console.log(`   HUGGINGFACE_API_TOKEN: ${hasHFToken ? '✅ Set' : '❌ Not set'}`);
  
  if (!hasHFToken) {
    console.log('   ℹ️  Will use rule-based analysis (fallback mode)');
  }
  
  // Initialize autograding service
  const mockStorage = new MockStorage();
  const autogradingService = new AutogradingService(mockStorage);
  
  console.log('\n2. Testing Autograding Service:');
  
  try {
    // Test autograding
    console.log('   🔄 Running autograding test...');
    const result = await autogradingService.autogradeSubmission(1);
    
    if (result.success) {
      console.log('   ✅ Autograding completed successfully!');
      console.log(`   📊 Score: ${result.analysis.suggestedScore}/100`);
      console.log(`   🎯 Code Quality: ${result.analysis.codeQuality}/100`);
      console.log(`   📖 Readability: ${result.analysis.readability}/100`);
      console.log(`   ⚡ Efficiency: ${result.analysis.efficiency}/100`);
      console.log(`   💪 Strengths: ${result.analysis.strengths.length} identified`);
      console.log(`   ⚠️  Weaknesses: ${result.analysis.weaknesses.length} identified`);
      
      // Show AI analysis snippet
      if (result.analysis.aiAnalysis) {
        const analysisSnippet = result.analysis.aiAnalysis.substring(0, 150) + '...';
        console.log(`   🤖 AI Analysis: ${analysisSnippet}`);
      }
    } else {
      console.log('   ❌ Autograding failed:', result.error);
    }
    
  } catch (error) {
    console.error('   ❌ Error during testing:', error.message);
  }
  
  console.log('\n3. Testing Direct API Connection:');
  
  if (hasHFToken) {
    try {
      console.log('   🔗 Testing Hugging Face API directly...');
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: 'Hello, this is a test message.',
            parameters: {
              max_new_tokens: 50,
              temperature: 0.7
            }
          })
        }
      );
      
      if (response.ok) {
        console.log('   ✅ Hugging Face API connection successful!');
        const data = await response.json();
        console.log('   📝 API Response received:', data ? 'Valid' : 'Invalid');
      } else {
        console.log(`   ❌ API Error: ${response.status} ${response.statusText}`);
        if (response.status === 503) {
          console.log('   ℹ️  Model may be loading - this is normal for first requests');
        }
      }
    } catch (error) {
      console.log('   ❌ Connection Error:', error.message);
    }
  } else {
    console.log('   ⏭️  Skipping API test (no token provided)');
  }
  
  console.log('\n4. Integration Status Summary:');
  
  if (hasHFToken) {
    console.log('   ✅ AI Integration: ENABLED (Hugging Face API)');
    console.log('   🎯 Analysis Mode: AI-Enhanced with Rule-based Fallback');
    console.log('   📊 Expected Quality: High (AI + Rules)');
  } else {
    console.log('   ⚠️  AI Integration: FALLBACK MODE (Rule-based only)');
    console.log('   🎯 Analysis Mode: Advanced Rule-based Analysis');
    console.log('   📊 Expected Quality: Good (Comprehensive Rules)');
  }
  
  console.log('\n✅ Test Complete!');
  console.log('\nTo enable full AI integration:');
  console.log('1. Get a free Hugging Face token: https://huggingface.co/settings/tokens');
  console.log('2. Add HUGGINGFACE_API_TOKEN=hf_your_token_here to your .env file');
  console.log('3. Restart the server');
  console.log('4. Run this test again to verify');
}

// Test the AI analysis system
async function testAIAnalysis() {
  console.log('🧪 Testing AI Analysis System...\n');
  
  const service = new AutogradingService();
  
  // Test cases
  const testCases = [
    {
      name: 'Trivial Code - Single Word',
      code: 'hello',
      language: 'python',
      expectLowScore: true
    },
    {
      name: 'Trivial Code - Single Letter',
      code: 'a',
      language: 'javascript',
      expectLowScore: true
    },
    {
      name: 'Trivial Code - Number',
      code: '123',
      language: 'python',
      expectLowScore: true
    },
    {
      name: 'Proper Code - Hello World',
      code: 'print("Hello, World!")',
      language: 'python',
      expectLowScore: false
    },
    {
      name: 'Proper Code - Function',
      code: `def add_numbers(a, b):
    return a + b

result = add_numbers(5, 3)
print(result)`,
      language: 'python',
      expectLowScore: false
    },
    {
      name: 'Code with Multiple Errors - Testing 20 Error Types',
      code: `# This code has multiple intentional errors for testing
def fibonacci(n):
    if n = 1:  # Syntax error: should be ==
        return 1
    elif n == 2:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)  # Inefficient algorithm

# Logical error: missing base case for n == 0
result = fibonacci(10)
print(result)

# Potential runtime error: no input validation
user_input = input("Enter a number: ")
result2 = fibonacci(user_input)  # Type error: string instead of int
print(result2)

# Security vulnerability: eval usage
code = input("Enter Python code: ")
eval(code)  # Dangerous eval usage

# Memory error potential: infinite recursion
def bad_function():
    return bad_function()  # Stack overflow

# Deprecated usage (example)
import string
print string.uppercase  # Old Python 2 syntax`,
      language: 'python',
      expectLowScore: true
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`Code: "${testCase.code}"`);
    
    try {
      const analysis = await service.analyzeCode(testCase.code, testCase.language);
      
      console.log(`📊 Results:`);
      console.log(`  Final Score: ${analysis.suggestedScore}/100`);
      console.log(`  Code Quality: ${analysis.codeQuality}/100`);
      console.log(`  Readability: ${analysis.readability}/100`);
      console.log(`  Efficiency: ${analysis.efficiency}/100`);
      
      // Check if scores match expectations
      if (testCase.expectLowScore) {
        if (analysis.suggestedScore <= 30) {
          console.log(`✅ PASS: Low score detected for trivial code (${analysis.suggestedScore}/100)`);
        } else {
          console.log(`❌ FAIL: Expected low score but got ${analysis.suggestedScore}/100`);
        }
      } else {
        if (analysis.suggestedScore >= 40) {
          console.log(`✅ PASS: Reasonable score for proper code (${analysis.suggestedScore}/100)`);
        } else {
          console.log(`❌ FAIL: Expected higher score but got ${analysis.suggestedScore}/100`);
        }
      }
      
      console.log(`  Strengths: ${analysis.strengths.join(', ')}`);
      console.log(`  Weaknesses: ${analysis.weaknesses.join(', ')}`);
      
      // Display comprehensive analysis excerpt
      if (analysis.aiAnalysis) {
        const analysisLines = analysis.aiAnalysis.split('\n');
        console.log(`  📝 Analysis Preview:`);
        console.log(`    ${analysisLines[0] || 'No analysis available'}`);
        console.log(`    ${analysisLines[1] || ''}`);
        console.log(`    ${analysisLines[2] || ''}`);
        if (analysisLines.length > 3) {
          console.log(`    ... (${analysisLines.length - 3} more lines)`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🎯 AI Analysis Testing Complete!');
}

// Test the trivial code detection specifically
async function testTrivialCodeDetection() {
  console.log('\n🔍 Testing Trivial Code Detection...\n');
  
  const service = new AutogradingService();
  
  // Test cases for trivial code detection
  const trivialCases = [
    'hello',
    'a',
    'test',
    '123',
    'print',
    'console',
    'var',
    'function',
    'if',
    'return',
    'null',
    'true',
    'false',
    ';',
    '{}',
    '()',
    '[]',
    'x',
    'y',
    'abc',
    'def',
    'todo',
    'fix',
    'bug',
    'error',
    'printf',
    'cout',
    'cin',
    'scanf',
    'gets',
    'puts',
    'getchar',
    'putchar',
    '++',
    '--',
    '==',
    '!=',
    '<=',
    '>=',
    '&&',
    '||',
    '!',
    '?',
    '~',
    '^',
    '|',
    '&',
    '@',
    '#',
    '$',
    '%',
    '0',
    '1',
    '2',
    '3.14',
    '0x1A',
    '0b101',
    '0o17',
    '"hello"',
    "'world'",
    '`test`',
    '// comment',
    '/* comment */',
    '# comment',
    '% comment',
    '@ annotation',
    '& reference',
    '$ variable',
    '! not',
    '? conditional',
    '~ bitwise',
    '^ xor',
    '| pipe',
    '< less',
    '> greater'
  ];
  
  const nonTrivialCases = [
    'print("Hello, World!")',
    'console.log("Hello, World!")',
    'printf("Hello, World!")',
    'cout << "Hello, World!" << endl;',
    'def add(a, b): return a + b',
    'function add(a, b) { return a + b; }',
    'int add(int a, int b) { return a + b; }',
    'public int add(int a, int b) { return a + b; }',
    'if (x > 0) { print("positive"); }',
    'for (int i = 0; i < 10; i++) { print(i); }',
    'while (x > 0) { x--; }',
    'class MyClass { public void method() {} }',
    'struct MyStruct { int x; int y; };',
    'enum Color { RED, GREEN, BLUE };',
    'switch (x) { case 1: break; default: break; }',
    'try { risky(); } catch (e) { handle(e); }',
    'async function fetchData() { return await api.get(); }',
    'const result = array.map(x => x * 2).filter(x => x > 10);',
    'SELECT * FROM users WHERE age > 18;',
    'CREATE TABLE users (id INT, name VARCHAR(255));',
    'INSERT INTO users (id, name) VALUES (1, "John");',
    'UPDATE users SET name = "Jane" WHERE id = 1;',
    'DELETE FROM users WHERE id = 1;',
    'import numpy as np\nprint(np.array([1, 2, 3]))',
    '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello"; return 0; }',
    'using System;\nclass Program { static void Main() { Console.WriteLine("Hello"); } }',
    'public class HelloWorld { public static void main(String[] args) { System.out.println("Hello"); } }',
    'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello") }',
    'fn main() { println!("Hello"); }',
    'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
    'function quicksort(arr) {\n    if (arr.length <= 1) return arr;\n    const pivot = arr[0];\n    const left = arr.slice(1).filter(x => x < pivot);\n    const right = arr.slice(1).filter(x => x >= pivot);\n    return [...quicksort(left), pivot, ...quicksort(right)];\n}'
  ];
  
  console.log('🔍 Testing Trivial Code Detection (should return true):');
  let trivialPassed = 0;
  let trivialTotal = trivialCases.length;
  
  for (const code of trivialCases) {
    const isTrivial = service.isTriviallCode(code);
    if (isTrivial) {
      console.log(`✅ "${code}" correctly detected as trivial`);
      trivialPassed++;
    } else {
      console.log(`❌ "${code}" incorrectly detected as non-trivial`);
    }
  }
  
  console.log(`\n📊 Trivial Code Detection: ${trivialPassed}/${trivialTotal} passed (${((trivialPassed/trivialTotal)*100).toFixed(1)}%)`);
  
  console.log('\n🔍 Testing Non-Trivial Code Detection (should return false):');
  let nonTrivialPassed = 0;
  let nonTrivialTotal = nonTrivialCases.length;
  
  for (const code of nonTrivialCases) {
    const isTrivial = service.isTriviallCode(code);
    if (!isTrivial) {
      console.log(`✅ "${code.substring(0, 50)}..." correctly detected as non-trivial`);
      nonTrivialPassed++;
    } else {
      console.log(`❌ "${code.substring(0, 50)}..." incorrectly detected as trivial`);
    }
  }
  
  console.log(`\n📊 Non-Trivial Code Detection: ${nonTrivialPassed}/${nonTrivialTotal} passed (${((nonTrivialPassed/nonTrivialTotal)*100).toFixed(1)}%)`);
  
  const overallAccuracy = ((trivialPassed + nonTrivialPassed) / (trivialTotal + nonTrivialTotal)) * 100;
  console.log(`\n🎯 Overall Detection Accuracy: ${overallAccuracy.toFixed(1)}%`);
  
  if (overallAccuracy >= 90) {
    console.log('✅ EXCELLENT: Trivial code detection is working well!');
  } else if (overallAccuracy >= 80) {
    console.log('✅ GOOD: Trivial code detection is working reasonably well.');
  } else if (overallAccuracy >= 70) {
    console.log('⚠️  FAIR: Trivial code detection needs some improvement.');
  } else {
    console.log('❌ POOR: Trivial code detection needs significant improvement.');
  }
}

// Run the test
testAIIntegration().catch(console.error);
testAIAnalysis().catch(console.error);
testTrivialCodeDetection().catch(console.error); 