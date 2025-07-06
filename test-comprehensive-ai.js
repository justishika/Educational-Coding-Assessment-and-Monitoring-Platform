const { AutogradingService } = require('./server/autograding-service');

// Quick test for the new comprehensive AI evaluation system
async function testComprehensiveAI() {
  console.log('🚀 Testing New Comprehensive AI Evaluation System...\n');
  
  const service = new AutogradingService();
  
  // Test the "hello" case that was problematic
  console.log('🔍 Testing: "hello" (should get very low score)');
  
  try {
    const analysis = await service.analyzeCode('hello', 'python');
    
    console.log(`📊 Results for "hello":`);
    console.log(`  Final Score: ${analysis.suggestedScore}/100`);
    console.log(`  Expected: 0-20 (trivial code)`);
    
    if (analysis.suggestedScore <= 20) {
      console.log(`✅ SUCCESS: Trivial code correctly scored low (${analysis.suggestedScore}/100)`);
    } else {
      console.log(`❌ FAILURE: Expected low score but got ${analysis.suggestedScore}/100`);
    }
    
    // Show comprehensive analysis preview
    console.log('\n📝 AI Analysis Preview:');
    const analysisLines = analysis.aiAnalysis.split('\n');
    analysisLines.slice(0, 10).forEach(line => console.log(`  ${line}`));
    if (analysisLines.length > 10) {
      console.log(`  ... (${analysisLines.length - 10} more lines)`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Test proper code
  console.log('\n🔍 Testing: Proper Python function (should get reasonable score)');
  
  const properCode = `def calculate_factorial(n):
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

result = calculate_factorial(5)
print(f"Factorial of 5 is: {result}")`;
  
  try {
    const analysis = await service.analyzeCode(properCode, 'python');
    
    console.log(`📊 Results for proper code:`);
    console.log(`  Final Score: ${analysis.suggestedScore}/100`);
    console.log(`  Expected: 50-100 (functional code)`);
    
    if (analysis.suggestedScore >= 50) {
      console.log(`✅ SUCCESS: Proper code correctly scored higher (${analysis.suggestedScore}/100)`);
    } else {
      console.log(`❌ FAILURE: Expected higher score but got ${analysis.suggestedScore}/100`);
    }
    
    // Show comprehensive analysis preview
    console.log('\n📝 AI Analysis Preview:');
    const analysisLines = analysis.aiAnalysis.split('\n');
    analysisLines.slice(0, 15).forEach(line => console.log(`  ${line}`));
    if (analysisLines.length > 15) {
      console.log(`  ... (${analysisLines.length - 15} more lines)`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n🎯 Comprehensive AI Testing Complete!');
  console.log('✅ The new system should now:');
  console.log('   - Detect 20 types of common errors');
  console.log('   - Provide severity-based scoring');
  console.log('   - Analyze algorithmic complexity');
  console.log('   - Give accurate scores for trivial vs proper code');
  console.log('   - Use qualitative grading scale');
}

// Run the test
testComprehensiveAI().catch(console.error); 