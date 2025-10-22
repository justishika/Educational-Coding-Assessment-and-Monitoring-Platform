import { Autograde, InsertAutograde } from "../shared/schema";
import { IStorage } from "./storage";

interface AICodeAnalysis {
  suggestedScore: number; // 0-100
  aiAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  codeQuality: number; // 0-100
  readability: number; // 0-100  
  efficiency: number; // 0-100
}

export class AutogradingService {
  private storage: IStorage;

  constructor(storage?: IStorage) {
    this.storage = storage || null as any; // Allow null for testing
  }

  /**
   * Public method to analyze code directly (for testing)
   */
  async analyzeCode(code: string, language: string): Promise<AICodeAnalysis> {
    return await this.analyzeCodeWithAI(code, language);
  }

  /**
   * Automatically grade a submission using AI analysis
   */
  async autogradeSubmission(submissionId: number): Promise<any> {
    try {
      console.log(`🤖 Starting PURE AI autograding for submission ${submissionId}`);
      
      // Get the submission
      const submission = await this.storage.getSubmissionById(submissionId);
      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      // Get file content if there are files
      let codeToAnalyze = submission.code;
      const fileSubmissions = await this.storage.getFileSubmissionsBySubmissionId(submissionId);
      if (fileSubmissions.length > 0) {
        // Use the first file's content if available
        codeToAnalyze = fileSubmissions[0].fileContent;
      }

      // Analyze code using AI ONLY - no fallbacks
      const analysis = await this.analyzeCodeWithAI(codeToAnalyze, submission.subject);
      
      // Create autograde record
      const autogradeData: InsertAutograde = {
        submissionId: submission.id,
        userId: submission.userId,
        suggestedScore: analysis.suggestedScore,
        aiAnalysis: analysis.aiAnalysis,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        improvements: JSON.stringify(analysis.improvements),
        codeQuality: analysis.codeQuality,
        readability: analysis.readability,
        efficiency: analysis.efficiency,
        status: "completed"
      };

      const autograde = await this.storage.createAutograde(autogradeData);
      
      console.log(`✅ PURE AI autograding completed for submission ${submissionId} with score ${analysis.suggestedScore}`);
      
      return {
        success: true,
        autograde,
        analysis
      };

    } catch (error) {
      console.error(`❌ Pure AI autograding failed for submission ${submissionId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Create a failed autograde record with score 0
      try {
        // Get submission details for user ID if possible
        let userId = 0;
        try {
          const submission = await this.storage.getSubmissionById(submissionId);
          if (submission) {
            userId = submission.userId;
          }
        } catch (getError) {
          console.error("Could not get submission details:", getError);
        }

        const failedAutograde = await this.storage.createAutograde({
          submissionId,
          userId,
          suggestedScore: 0,
          aiAnalysis: `🚨 AI AUTOGRADING FAILED - Score: 0/100

❌ This submission could not be graded by AI and receives a score of 0.
❌ Error: ${errorMessage}
❌ Please review the code and resubmit if needed.

This is an automatic score of 0 due to AI grading failure.`,
          strengths: JSON.stringify([]),
          weaknesses: JSON.stringify(["AI grading system failure", "Code could not be analyzed"]),
          improvements: JSON.stringify(["Review code format and syntax", "Ensure code is complete and valid"]),
          codeQuality: 0,
          readability: 0,
          efficiency: 0,
          status: "failed"
        });

        // Return success with 0 score instead of failure
        return {
          success: true,
          autograde: failedAutograde,
          analysis: {
            suggestedScore: 0,
            aiAnalysis: failedAutograde.aiAnalysis,
            strengths: [],
            weaknesses: ["AI grading system failure", "Code could not be analyzed"],
            improvements: ["Review code format and syntax", "Ensure code is complete and valid"],
            codeQuality: 0,
            readability: 0,
            efficiency: 0
          }
        };
      } catch (createError) {
        console.error("Failed to create error autograde record:", createError);
        
        // Even if we can't create the record, return success with 0 score
        return {
          success: true,
          autograde: null,
          analysis: {
            suggestedScore: 0,
            aiAnalysis: "AI grading failed - Score: 0/100",
            strengths: [],
            weaknesses: ["AI grading system failure"],
            improvements: ["Review and resubmit code"],
            codeQuality: 0,
            readability: 0,
            efficiency: 0
          }
        };
      }
    }
  }

  /**
   * Analyze code using AI ONLY - NO FALLBACKS
   */
  private async analyzeCodeWithAI(code: string, language: string): Promise<AICodeAnalysis> {
    // This system is now PURELY AI-driven - no hardcoded analysis
    if (!process.env.GROQ_API_KEY) {
      throw new Error("❌ No AI API configured! This system requires Groq API for autograding. Please set GROQ_API_KEY in your .env file.");
    }

    try {
      console.log("🚀 Using PURE AI Analysis with Groq - NO FALLBACKS");
      const analysis = await this.callGroqAPI(code, language);
      return analysis;
    } catch (error) {
      console.error("❌ Pure AI analysis failed:", error);
      throw new Error(`AI autograding failed: ${error instanceof Error ? error.message : 'Unknown error'}. No fallback available - this system requires AI API.`);
    }
  }

  // Pure AI-driven code analysis using Groq
  private async callGroqAPI(code: string, language: string): Promise<AICodeAnalysis> {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      throw new Error("Groq API key not configured");
    }
    
    const prompt = `You are an expert code reviewer. Analyze this ${language} code and return ONLY valid JSON.

CODE TO ANALYZE:
\`\`\`${language}
${code}
\`\`\`

STRICT EVALUATION CRITERIA:
1. CORRECTNESS (0-40 points): 
   - Trivial code (single words, incomplete functions) = 0-8 points
   - Non-functional code = 0-12 points
   - Working code = 20-40 points

2. READABILITY (0-10 points): Code style, naming, comments
   - Unprofessional content = 0-2 points
   - Poor style = 3-5 points
   - Good style = 6-10 points

3. EFFICIENCY (0-20 points): Algorithm complexity analysis

4. ERRORS: Detect and penalize common coding errors
   - Critical errors: -15 to -20 points
   - High errors: -8 to -12 points
   - Medium errors: -4 to -6 points

REQUIRED JSON FORMAT:
{
  "finalScore": [0-100 number],
  "gradeLevel": "[description]",
  "evaluation": {
    "correctness": {
      "passedCases": [number],
      "totalCases": [number],
      "score": [0-40 number]
    },
    "errors": [
      {
        "type": "[error type]",
        "line": [number],
        "description": "[description]",
        "severity": "[Critical/High/Medium/Low]",
        "deduction": [number]
      }
    ],
    "readability": {
      "score": [0-10 number],
      "comments": "[feedback]"
    },
    "complexity": {
      "observed": {
        "time": "[Big O notation]",
        "space": "[Big O notation]"
      },
      "expected": {
        "time": "[Expected Big O]",
        "space": "[Expected Big O]"
      },
      "deduction": [0-20 number],
      "remarks": "[analysis]"
    }
  },
  "overallRemarks": "[summary]"
}

CRITICAL: Return ONLY the JSON object. No explanations, no markdown, no additional text.`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
          headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
          },
          body: JSON.stringify({
          model: 'llama3-8b-8192',
            messages: [
              {
              role: 'system',
              content: 'You are an expert code reviewer. You must respond with valid JSON only. No explanations, no markdown, no additional text - just the JSON response.'
              },
              {
              role: 'user',
                content: prompt
              }
            ],
          temperature: 0.2, // Lower temperature for more consistent JSON
          max_tokens: 2500, // Increased to prevent truncation
          top_p: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("🔍 Raw AI Response:", JSON.stringify(result, null, 2));
      
      // Check if response was truncated
      const finishReason = result.choices?.[0]?.finish_reason;
      if (finishReason === 'length') {
        throw new Error("AI response was truncated due to max_tokens limit. Increase max_tokens or simplify prompt.");
      }
      
      return this.parseGroqResponse(result);
    } catch (error) {
      console.error("❌ Error calling Groq API:", error);
      throw new Error(`AI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Parse pure AI response from Groq (JSON format) - NO FALLBACKS
  private parseGroqResponse(result: any): AICodeAnalysis {
    try {
      // Extract the AI response from Groq's chat completion format
      const aiResponseText = result.choices?.[0]?.message?.content || "";
      
      if (!aiResponseText) {
        throw new Error("No response content received from AI");
      }

      console.log("🔍 Parsing PURE AI response - NO FALLBACKS ALLOWED");
      console.log("📝 Raw AI Response:", aiResponseText);
      
      // Try to parse JSON response from AI
      let aiData;
      try {
        // More robust JSON extraction approach
        let cleanedResponse = aiResponseText.trim();
        
        // Remove markdown code blocks
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try multiple JSON extraction strategies
        let jsonStr = '';
        
        // Strategy 1: Look for complete JSON object using regex
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        } else {
          // Strategy 2: Find first { and try to extract until the end
          const firstBrace = cleanedResponse.indexOf('{');
          if (firstBrace !== -1) {
            jsonStr = cleanedResponse.substring(firstBrace);
            
            // Try to find the end by trying to parse incrementally
            for (let i = jsonStr.length; i >= 1; i--) {
              try {
                const testStr = jsonStr.substring(0, i);
                JSON.parse(testStr);
                jsonStr = testStr;
                break;
              } catch (e) {
                // Continue trying shorter strings
              }
            }
          }
        }
        
        if (!jsonStr) {
          throw new Error("Could not extract JSON from AI response");
        }
        
        console.log("🧹 Extracted JSON:", jsonStr);
        
        aiData = JSON.parse(jsonStr);
        console.log("✅ JSON parsing successful!");
        
      } catch (parseError) {
        console.error("❌ AI didn't return valid JSON - returning score 0");
        console.error("🔍 Parse error:", parseError instanceof Error ? parseError.message : String(parseError));
        console.error("📝 Full AI response:", aiResponseText);
        
        // Return default structure with score 0 instead of throwing error
        return {
          suggestedScore: 0,
          aiAnalysis: `🚨 AI AUTOGRADING FAILED - Score: 0/100

❌ AI returned invalid JSON format and cannot be graded.
❌ Parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}
❌ Please review the code and resubmit if needed.

This is an automatic score of 0 due to AI response parsing failure.`,
          strengths: [],
          weaknesses: ["AI response parsing failure", "Invalid JSON format"],
          improvements: ["Review code format and syntax", "Ensure code is complete and valid"],
          codeQuality: 0,
          readability: 0,
          efficiency: 0
        };
      }

      // Validate REQUIRED AI response fields - NO DEFAULTS
      const requiredFields = ['finalScore', 'evaluation'];
      const missingFields = [];
      
      if (aiData.finalScore === undefined && aiData.finalScore !== 0) {
        missingFields.push('finalScore');
      }
      if (!aiData.evaluation) {
        missingFields.push('evaluation');
      }
      if (aiData.evaluation && !aiData.evaluation.correctness) {
        missingFields.push('evaluation.correctness');
      }
      if (aiData.evaluation && !aiData.evaluation.readability) {
        missingFields.push('evaluation.readability');
      }
      
      if (missingFields.length > 0) {
        console.error(`❌ AI response missing required fields: ${missingFields.join(', ')} - returning score 0`);
        
        // Return default structure with score 0 instead of throwing error
        return {
          suggestedScore: 0,
          aiAnalysis: `🚨 AI AUTOGRADING FAILED - Score: 0/100

❌ AI response missing required fields: ${missingFields.join(', ')}
❌ Cannot grade incomplete AI response.
❌ Please review the code and resubmit if needed.

This is an automatic score of 0 due to incomplete AI response.`,
          strengths: [],
          weaknesses: ["AI response incomplete", "Missing required fields"],
          improvements: ["Review code format and syntax", "Ensure code is complete and valid"],
          codeQuality: 0,
          readability: 0,
          efficiency: 0
        };
      }

      // Use ONLY AI-provided scores - NO FALLBACKS
      const suggestedScore = this.validateScoreRange(aiData.finalScore);
      const codeCorrectness = this.validateScoreRange(aiData.evaluation.correctness.score, 40);
      const codeQuality = this.validateScoreRange(aiData.evaluation.readability.score * 10, 100);
      const readability = this.validateScoreRange(aiData.evaluation.readability.score * 10, 100);
      const efficiency = this.validateScoreRange(20 - (aiData.evaluation.complexity?.deduction || 0), 20);

      console.log("📊 AI Scores:", {
        suggested: suggestedScore,
        correctness: codeCorrectness,
        quality: codeQuality,
        readability: readability,
        efficiency: efficiency
      });

      // Extract error information
      const errors = aiData.evaluation.errors || [];
      const errorSummary = errors.length > 0 
        ? errors.map((err: any) => `Line ${err.line}: ${err.type} (${err.severity}) - ${err.description}`).join('\n')
        : "No critical errors detected by AI.";

      // Create comprehensive AI analysis
      const aiAnalysis = `🚀 PURE AI Analysis by Groq (Llama 3) - NO FALLBACKS:

📊 OVERALL GRADE: ${aiData.gradeLevel || "Grade not specified"} (${suggestedScore}/100)

✅ CORRECTNESS EVALUATION:
• Test Cases: ${aiData.evaluation.correctness.passedCases || "N/A"} / ${aiData.evaluation.correctness.totalCases || "N/A"}
• Correctness Score: ${codeCorrectness}/40

❌ ERROR DETECTION (20 Common Types):
${errorSummary}

🧠 CODE READABILITY & STYLE:
• Readability Score: ${aiData.evaluation.readability.score || "N/A"}/10
• Comments: ${aiData.evaluation.readability.comments || "No specific feedback provided by AI."}

⚙️ ALGORITHMIC EFFICIENCY:
• Observed Time Complexity: ${aiData.evaluation.complexity?.observed?.time || "Not analyzed by AI"}
• Observed Space Complexity: ${aiData.evaluation.complexity?.observed?.space || "Not analyzed by AI"}
• Expected Time Complexity: ${aiData.evaluation.complexity?.expected?.time || "Not specified by AI"}
• Expected Space Complexity: ${aiData.evaluation.complexity?.expected?.space || "Not specified by AI"}
• Efficiency Deduction: ${aiData.evaluation.complexity?.deduction || 0} points
• Remarks: ${aiData.evaluation.complexity?.remarks || "No specific feedback provided by AI."}

📝 DETAILED ERRORS FOUND BY AI:
${errors.map((err: any, i: number) => `${i + 1}. ${err.type} (Line ${err.line})
   Severity: ${err.severity} | Deduction: ${err.deduction} points
   Description: ${err.description}`).join('\n\n')}

🔍 OVERALL REMARKS FROM AI:
${aiData.overallRemarks || "No overall remarks provided by AI."}

🤖 This analysis uses pure AI evaluation with 20 error categories, severity-based scoring, and algorithmic efficiency analysis.
⚠️ NO FALLBACK SCORING - All grades provided directly by AI.`;

      return {
        suggestedScore,
        aiAnalysis,
        strengths: errors.length === 0 ? ["No critical errors detected by AI", "Code passed AI analysis"] : ["Code structure analyzed by AI"],
        weaknesses: errors.length > 0 ? errors.map((err: any) => `${err.type}: ${err.description}`) : ["No major issues identified by AI"],
        improvements: errors.length > 0 ? errors.map((err: any) => `Fix ${err.type} on line ${err.line}`) : ["Continue following best practices"],
        codeQuality,
        readability,
        efficiency
      };
      
    } catch (error) {
      console.error("❌ Critical error parsing pure AI response:", error);
      
      // Return default structure with score 0 instead of throwing error
      return {
        suggestedScore: 0,
        aiAnalysis: `🚨 AI AUTOGRADING FAILED - Score: 0/100

❌ Critical error parsing AI response: ${error instanceof Error ? error.message : 'Unknown error'}
❌ Cannot grade due to AI system failure.
❌ Please review the code and resubmit if needed.

This is an automatic score of 0 due to AI system failure.`,
        strengths: [],
        weaknesses: ["AI system failure", "Critical parsing error"],
        improvements: ["Review code format and syntax", "Ensure code is complete and valid"],
        codeQuality: 0,
        readability: 0,
        efficiency: 0
      };
    }
  }

  // Validate AI scores are within acceptable ranges - return 0 for invalid scores
  private validateScoreRange(score: any, maxScore: number = 100): number {
    if (score === null || score === undefined) {
      console.error("AI provided null/undefined score - returning 0");
      return 0;
    }
    
    const numScore = typeof score === 'number' ? score : parseInt(String(score));
    
    if (isNaN(numScore)) {
      console.error(`AI provided invalid score: ${score} - returning 0`);
      return 0;
    }
    
    return Math.max(0, Math.min(maxScore, numScore));
  }
} 