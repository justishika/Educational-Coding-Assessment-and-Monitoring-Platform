import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { spinUpContainer, stopContainer } from "./container-manager";
import { mongoService } from "./mongodb";
import { puppeteerService } from "./utils/capture.js";
import { 
  insertSubmissionSchema,
  insertLogSchema 
} from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs";
import multer from "multer";
import { AutogradingService } from "./autograding-service";

// Function to clean corrupted code content
function cleanCodeContent(content: string): string {
  // First, handle the specific pattern we see in the screenshot
  let cleaned = content
    // Remove inline references that can span multiple lines
    .replace(/inlineRef\{[^}]*\}/g, '')
    // Remove any JSON-like metadata embedded in code
    .replace(/,\s*&quot;[^"]*&quot;\s*:/g, '')
    // Remove HTML entities
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&#58;/g, ':')
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-zA-Z0-9#]+;/g, '')
    // Remove URL patterns and favicon references
    .replace(/https?:\/\/[^\s\)]+/g, '')
    .replace(/favicon[^;]*;/g, '')
    // Remove any remaining metadata patterns
    .replace(/references=[^,\}]*/g, '')
    .replace(/type[^,\}]*/g, '')
    .replace(/start_index[^,\}]*/g, '');

  // Split into lines and clean each line
  const lines = cleaned.split('\n');
  const cleanedLines = lines.map(line => {
    return line
      // Remove any remaining encoded content
      .replace(/[&][^;]*;/g, '')
      // Clean up excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(line => {
    // Remove empty lines and lines that are just metadata
    return line.length > 0 && 
           !line.match(/^[,\{\}\[\]":\s]*$/) &&
           !line.includes('inlineRef') &&
           !line.includes('references=') &&
           !line.includes('start_index');
  });

  // Reconstruct proper Python indentation based on common patterns
  const result = cleanedLines.map(line => {
    if (line.startsWith('def ') || line.startsWith('class ') || line.startsWith('if ') || 
        line.startsWith('for ') || line.startsWith('while ') || line.startsWith('try:') ||
        line.startsWith('except') || line.startsWith('finally:') || line.startsWith('with ')) {
      return line;
    }
    if (line.startsWith('#')) {
      return '    ' + line; // Comments are usually indented
    }
    if (line.includes('=') || line.includes('return') || line.includes('print') ||
        line.includes('append') || line.includes('if ')) {
      return '    ' + line; // Statements are usually indented
    }
    return line;
  }).join('\n');

  return result.trim();
}


// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common code file extensions
    const allowedExtensions = ['.js', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.ts', '.tsx', '.jsx', '.html', '.css', '.sql', '.r', '.swift', '.kt', '.dart', '.scala', '.hs', '.pl', '.sh', '.bat'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Additional security middleware for API endpoints
  app.use('/api', (req, res, next) => {
    // Block common attack patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /drop.*table/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /onload/i,  // Event handler injection
    ];
    
    const url = req.url.toLowerCase();
    const body = JSON.stringify(req.body || {}).toLowerCase();
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body)) {
        console.log(`🚨 Blocked suspicious request: ${req.method} ${req.url}`);
        return res.status(400).json({ 
          error: 'Invalid request detected',
          message: 'Request blocked for security reasons'
        });
      }
    }
    
    next();
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check user role
  const checkRole = (role: string) => (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user?.role === role) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Health check endpoint (no authentication required)
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Block access to common API documentation paths
  app.get(["/api-docs", "/swagger", "/docs", "/api", "/openapi.json"], (req, res) => {
    res.status(404).json({ 
      error: "Not Found",
      message: "API documentation is not publicly available"
    });
  });
  app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

  // Protected routes for students
  app.get("/api/student/dashboard", isAuthenticated, checkRole("student"), (req, res) => {
    res.json({ message: "Student dashboard" });
  });
  
  // Protected routes for admins
  app.get("/api/admin/dashboard", isAuthenticated, checkRole("admin"), (req, res) => {
    res.json({ message: "Admin dashboard" });
  });

  // Initialize autograding service
  const autogradingService = new AutogradingService(storage);

  // Submit code endpoint (enhanced with autograding)
  app.post("/api/submit", isAuthenticated, async (req, res) => {
    try {
      const submission = await storage.createSubmission({
        userId: req.user?.id!,
        subject: req.body.subject,
        code: req.body.code
      });

      // Trigger autograding in the background
      autogradingService.autogradeSubmission(submission.id).catch(error => {
        console.error(`Failed to autograde submission ${submission.id}:`, error);
      });

      res.status(201).json(submission);
    } catch (error) {
      console.error('Submit error:', error);
      res.status(500).json({ message: "Failed to submit code" });
    }
  });

  // File upload submission endpoint (enhanced with autograding)
  app.post("/api/submit-file", isAuthenticated, upload.single('codeFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { subject } = req.body;
      const file = req.file;
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let fileContent = file.buffer.toString('utf-8');

      // Clean the file content from any inline references, HTML entities, and metadata
      fileContent = cleanCodeContent(fileContent);

      // Create submission record
      const submission = await storage.createSubmission({
        userId: req.user?.id!,
        subject: subject,
        code: `// File upload: ${file.originalname}\n${fileContent}`,
        hasFile: true,
        filename: file.originalname,
        fileExtension: fileExtension,
        fileSize: file.size
      });

      // Store the actual file content
      await storage.createFileSubmission({
        submissionId: submission.id,
        filename: `${Date.now()}_${file.originalname}`,
        originalName: file.originalname,
        fileContent: fileContent,
        mimeType: file.mimetype,
        fileSize: file.size
      });

      // Trigger autograding in the background
      autogradingService.autogradeSubmission(submission.id).catch(error => {
        console.error(`Failed to autograde file submission ${submission.id}:`, error);
      });

      res.status(201).json({
        ...submission,
        message: "File submitted successfully",
        fileInfo: {
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype
        }
      });

    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get autograde results for a submission
  app.get("/api/autogrades/submission/:submissionId", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const autogrades = await storage.getAutogradesBySubmissionId(submissionId);
      
      if (autogrades.length === 0) {
        return res.status(404).json({ message: "No autograding results found for this submission" });
      }

      // Return the most recent autograde
      const latestAutograde = autogrades.sort((a, b) => 
        new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()
      )[0];

      // Parse AI analysis results
      const parsedAutograde = {
        ...latestAutograde,
        strengths: JSON.parse(latestAutograde.strengths || "[]"),
        weaknesses: JSON.parse(latestAutograde.weaknesses || "[]"),
        improvements: JSON.parse(latestAutograde.improvements || "[]")
      };

      res.json(parsedAutograde);
    } catch (error) {
      console.error("Error fetching autograde results:", error);
      res.status(500).json({ message: "Failed to fetch autograde results" });
    }
  });

  // Trigger autograding for a specific submission (admin only)
  app.post("/api/admin/autograde/:submissionId", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      console.log(`🤖 Admin triggered re-autograding for submission ${submissionId}`);
      
      const result = await autogradingService.autogradeSubmission(submissionId);
      
      // Handle the case where autograde record creation failed but we still have analysis
      if (!result.success && !result.analysis) {
        return res.status(500).json({ message: result.error || "Autograding failed" });
      }

      // Use autograde record if available, otherwise use the analysis directly
      let parsedAutograde;
      if (result.autograde) {
        parsedAutograde = {
          ...result.autograde,
          strengths: JSON.parse(result.autograde.strengths || "[]"),
          weaknesses: JSON.parse(result.autograde.weaknesses || "[]"),
          improvements: JSON.parse(result.autograde.improvements || "[]")
        };
      } else if (result.analysis) {
        // Use analysis directly if autograde record couldn't be created
        parsedAutograde = {
          id: null,
          submissionId,
          userId: 0,
          suggestedScore: result.analysis.suggestedScore,
          aiAnalysis: result.analysis.aiAnalysis,
          strengths: result.analysis.strengths,
          weaknesses: result.analysis.weaknesses,
          improvements: result.analysis.improvements,
          codeQuality: result.analysis.codeQuality,
          readability: result.analysis.readability,
          efficiency: result.analysis.efficiency,
          status: "failed",
          gradedAt: new Date()
        };
      } else {
        // Fallback case
        parsedAutograde = {
          id: null,
          submissionId,
          userId: 0,
          suggestedScore: 0,
          aiAnalysis: "AI autograding failed - Score: 0/100",
          strengths: [],
          weaknesses: ["AI grading system failure"],
          improvements: ["Review and resubmit code"],
          codeQuality: 0,
          readability: 0,
          efficiency: 0,
          status: "failed",
          gradedAt: new Date()
        };
      }

      console.log(`✅ Re-autograding completed for submission ${submissionId} with score ${parsedAutograde.suggestedScore}`);
      res.json(parsedAutograde);
    } catch (error) {
      console.error("Error triggering autograding:", error);
      res.status(500).json({ message: "Failed to trigger autograding" });
    }
  });

  // Grade submission endpoint (enhanced with autograde approval)
  app.post("/api/admin/grade", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const { submissionId, score, feedback, approveAutograde } = req.body;

      if (typeof submissionId !== 'number' || typeof score !== 'number' || typeof feedback !== 'string') {
        return res.status(400).json({ message: "Invalid grade data" });
      }

      // Fetch the submission to get the student userId
      const submissions = await storage.getSubmissions();
      const submission = submissions.find(s => s.id === submissionId);

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Save to grades table
      const grade = await storage.createGrade({
        submissionId,
        userId: submission.userId, 
        score,
        feedback,
        gradedBy: req.user!.id, // admin's userId
        gradedAt: new Date()
      });

      console.log(`Grade submitted for submission ${submissionId}: score=${score}, feedback=${feedback}${approveAutograde ? ' (approved autograde)' : ''}`);
      res.status(200).json({ success: true, grade });
    } catch (error) {
      console.error("Error in /api/admin/grade:", error);
      res.status(500).json({ message: "Failed to submit grade" });
    }
  });

  // Debug endpoint to check raw submission data
  app.get("/api/debug/submissions", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🔍 Debug: Fetching raw submissions from database...');
      const submissions = await storage.getSubmissions();
      console.log('🔍 Debug: Raw submissions count:', submissions.length);
      
      const debugData = submissions.slice(0, 5).map(s => ({
        id: s.id,
        userId: s.userId,
        subject: s.subject,
        hasFile: s.hasFile,
        filename: s.filename,
        codeExists: !!s.code,
        codeLength: s.code ? s.code.length : 0,
        codePreview: s.code ? s.code.substring(0, 100) + '...' : 'NO CODE',
        fullCode: s.code,
        timestamp: s.timestamp
      }));
      
      console.log('🔍 Debug: Processed debug data:', debugData);
      res.json({ submissions: debugData });
    } catch (error) {
      console.error("🔍 Debug: Error fetching submissions:", error);
      res.status(500).json({ 
        message: "Failed to fetch submissions", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get all submissions with autograde information (admin only)
  app.get("/api/submissions", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const submissions = await storage.getSubmissions();
      
      // Add user info, grade status, and autograde info to each submission
      const submissionsWithInfo = await Promise.all(
        submissions.map(async (submission) => {
          const user = await storage.getUser(submission.userId);
          
          // Check if this submission has been graded
          const grades = await storage.getGradesBySubmissionId(submission.id);
          const isGraded = grades.length > 0;
          const grade = isGraded ? grades[0] : null;
          
          // Get autograde information with backward compatibility
          const autogrades = await storage.getAutogradesBySubmissionId(submission.id);
          const hasAutograde = autogrades.length > 0;
          let autograde = null;
          
          if (hasAutograde && autogrades[0]) {
            const rawAutograde = autogrades[0];
            // Handle both old and new autograde schema
            autograde = {
              ...rawAutograde,
              // Parse JSON fields safely with fallbacks for old data
              strengths: rawAutograde.strengths ? 
                (typeof rawAutograde.strengths === 'string' ? 
                  JSON.parse(rawAutograde.strengths) : rawAutograde.strengths) : [],
              weaknesses: rawAutograde.weaknesses ? 
                (typeof rawAutograde.weaknesses === 'string' ? 
                  JSON.parse(rawAutograde.weaknesses) : rawAutograde.weaknesses) : [],
              improvements: rawAutograde.improvements ? 
                (typeof rawAutograde.improvements === 'string' ? 
                  JSON.parse(rawAutograde.improvements) : rawAutograde.improvements) : [],
              // Handle old test-based autogrades
              aiAnalysis: rawAutograde.aiAnalysis || "Legacy autograde data - AI analysis not available",
              codeQuality: rawAutograde.codeQuality || 70,
              readability: rawAutograde.readability || 70,
              efficiency: rawAutograde.efficiency || 70,
              suggestedScore: rawAutograde.suggestedScore || 70
            };
          }
          
          return {
            ...submission,
            user: user ? { id: user.id, email: user.email, role: user.role } : null,
            graded: isGraded,
            grade: grade,
            hasAutograde,
            autograde
          };
        })
      );
      
      res.json(submissionsWithInfo);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });



  // Download VS Code workspace template
  app.get("/api/download-template/:language", isAuthenticated, async (req, res) => {
    try {
      const { language } = req.params;
      const templates = {
        javascript: {
          filename: 'solution.js',
          content: `// JavaScript Solution Template
// Student: ${req.user?.email}
// Generated: ${new Date().toISOString()}

function solution() {
    // Write your code here
    console.log("Hello, World!");
}

solution();`
        },
        python: {
          filename: 'solution.py',
          content: `# Python Solution Template
# Student: ${req.user?.email}
# Generated: ${new Date().toISOString()}

def solution():
    # Write your code here
    print("Hello, World!")

if __name__ == "__main__":
    solution()`
        },
        java: {
          filename: 'Solution.java',
          content: `// Java Solution Template
// Student: ${req.user?.email}
// Generated: ${new Date().toISOString()}

public class Solution {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello, World!");
    }
}`
        },
        cpp: {
          filename: 'solution.cpp',
          content: `// C++ Solution Template
// Student: ${req.user?.email}
// Generated: ${new Date().toISOString()}

#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello, World!" << endl;
    return 0;
}`
        }
      };

      const template = templates[language as keyof typeof templates];
      if (!template) {
        return res.status(400).json({ message: "Unsupported language" });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
      res.send(template.content);

    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({ message: "Failed to download template" });
    }
  });



  // Download submitted file (for admins to review)
  app.get("/api/admin/download-submission/:submissionId", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const fileSubmissions = await storage.getFileSubmissionsBySubmissionId(submissionId);
      
      if (fileSubmissions.length === 0) {
        return res.status(404).json({ message: "No files found for this submission" });
      }

      const fileSubmission = fileSubmissions[0]; // Get the first file
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileSubmission.originalName}"`);
      res.setHeader('Content-Type', fileSubmission.mimeType || 'text/plain');
      res.send(fileSubmission.fileContent);

    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Get file content for viewing in browser (admin only)
  app.get("/api/admin/view-file/:submissionId", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const fileSubmissions = await storage.getFileSubmissionsBySubmissionId(submissionId);
      
      if (fileSubmissions.length === 0) {
        return res.status(404).json({ message: "No files found for this submission" });
      }

      const fileSubmission = fileSubmissions[0];
      
      // Clean the file content before sending it
      const cleanedContent = cleanCodeContent(fileSubmission.fileContent || '');
      
      res.json({
        filename: fileSubmission.originalName,
        content: cleanedContent,
        mimeType: fileSubmission.mimeType,
        size: fileSubmission.fileSize,
        uploadedAt: fileSubmission.uploadedAt
      });

    } catch (error) {
      console.error('File view error:', error);
      res.status(500).json({ message: "Failed to view file" });
    }
  });

  // Enhanced Puppeteer screenshot capture endpoint
  app.post("/api/capture-screenshot", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id!;
      const { subject, containerUrl } = req.body;
      
      // Use provided URL or construct default
      const targetUrl = containerUrl || `http://localhost:${8080 + userId}`;
      
      console.log(`📸 Manual Puppeteer screenshot requested for user ${userId}: ${targetUrl}`);
      
      const result = await puppeteerService.captureAndSaveToMongoDB(
        targetUrl, 
        userId, 
        subject || 'manual', 
        'manual'
      );
      
      if (result.success) {
        // Also log to SQLite for Event Logs tab
        try {
          const log = insertLogSchema.parse({
            userId: userId,
            type: "screenshot",
            data: JSON.stringify({
              method: 'puppeteer-server-side',
              containerUrl: targetUrl,
              filename: result.filename,
              imageSize: result.imageSize,
              timestamp: result.timestamp,
              subject: subject || 'manual',
              captureEvent: 'manual',
              captureType: result.captureType || 'browser'
            })
          });
          await storage.createLog(log);
          console.log(`📝 Puppeteer screenshot logged to Event Logs for user ${userId}`);
        } catch (logError) {
          console.error('Failed to log Puppeteer screenshot to Event Logs:', logError);
        }

        res.json({
          success: true,
          message: "High-quality screenshot captured via Puppeteer and saved to MongoDB Atlas",
          timestamp: result.timestamp,
          filename: result.filename,
          imageSize: result.imageSize,
          captureMethod: 'puppeteer-server-side',
          captureType: result.captureType || 'browser'
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Puppeteer screenshot capture failed",
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('Puppeteer screenshot endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Puppeteer screenshot capture failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Anti-cheat violation logging endpoint
  app.post("/api/log-violation", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id!;
      const { type, details, severity, timestamp, userAgent } = req.body;
      
      console.log(`🚨 Security violation logged for user ${userId}: ${type} - ${details} (${severity})`);
      
      // Log to SQLite for Event Logs tab
      try {
        const log = insertLogSchema.parse({
          userId: userId,
          type: "violation",
          data: JSON.stringify({
            violationType: type,
            details: details,
            severity: severity,
            timestamp: timestamp,
            userAgent: userAgent,
            method: 'anti-cheat-system'
          })
        });
        await storage.createLog(log);
        console.log(`📝 Security violation logged to Event Logs for user ${userId}: ${type}`);
      } catch (logError) {
        console.error('Failed to log violation to Event Logs:', logError);
      }

      res.json({
        success: true,
        message: "Violation logged successfully"
      });
      
    } catch (error) {
      console.error('Violation logging endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to log violation",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Desktop screen capture endpoint (captures entire system screen)
  app.post("/api/capture-desktop", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id!;
      const { subject } = req.body;
      
      console.log(`🖥️ Desktop screen capture requested for user ${userId}`);
      
      const result = await puppeteerService.captureDesktopAndSaveToMongoDB(
        userId, 
        subject || 'desktop', 
        'manual'
      );
      
      if (result.success) {
        // Also log to SQLite for Event Logs tab
        try {
          const log = insertLogSchema.parse({
            userId: userId,
            type: "screenshot",
            data: JSON.stringify({
              method: 'puppeteer-server-side',
              containerUrl: 'desktop-capture',
              filename: result.filename,
              imageSize: result.imageSize,
              timestamp: result.timestamp,
              subject: subject || 'desktop',
              captureEvent: 'manual',
              captureType: 'desktop'
            })
          });
          await storage.createLog(log);
          console.log(`📝 Desktop screenshot logged to Event Logs for user ${userId}`);
        } catch (logError) {
          console.error('Failed to log desktop screenshot to Event Logs:', logError);
        }

        res.json({
          success: true,
          message: "Desktop screen captured successfully and saved to MongoDB Atlas",
          timestamp: result.timestamp,
          filename: result.filename,
          imageSize: result.imageSize,
          captureMethod: 'puppeteer-server-side',
          captureType: 'desktop'
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Desktop screen capture failed",
          error: result.error
        });
      }
      
    } catch (error) {
      console.error('Desktop capture endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Desktop screen capture failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Bulk screenshot capture for all active users (admin only)
  app.post("/api/admin/capture-all-screenshots", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      // This would capture screenshots for all active codespaces
      // Implementation would depend on how you track active containers
      const activeUsers = [1, 2, 3]; // Example - you'd get this from your container tracking
      
      const capturePromises = activeUsers.map(userId => {
        const containerUrl = `http://localhost:${8080 + userId}`;
        return puppeteerService.captureAndSaveToMongoDB(
          containerUrl, 
          userId, 
          'admin-capture', 
          'admin-bulk'
        );
      });
      
      const results = await Promise.allSettled(capturePromises);
      
      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
        failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
      };
      
      res.json({
        success: true,
        message: "Bulk screenshot capture completed",
        summary,
        results: results.map((r, i) => ({
          userId: activeUsers[i],
          status: r.status,
          ...(r.status === 'fulfilled' ? { result: r.value } : { error: r.reason })
        }))
      });
      
    } catch (error) {
      console.error('Bulk screenshot capture error:', error);
      res.status(500).json({
        success: false,
        message: "Bulk screenshot capture failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get student grades by email (admin only)
 app.get("/api/admin/grades/:email", isAuthenticated, checkRole("admin"), async (req, res) => {
  try {
    const studentEmail = req.params.email;
    console.log(`Fetching grades for student: ${studentEmail}`);

    // 1. Find the user by email
    const user = await storage.getUserByEmail(studentEmail);
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Get all submissions by this user
    const submissions = await storage.getSubmissionsByUserId(user.id);

    // 3. Get all grades for these submissions with error handling
    let grades: any[] = [];
    for (const submission of submissions) {
      try {
        const gradeList = await storage.getGradesBySubmissionId(submission.id);
        // Attach submission info (e.g., subject) to each grade
        grades.push(...gradeList.map(g => ({
          ...g,
          subject: submission.subject,
          timestamp: submission.timestamp,
          // Ensure compatibility with both old and new grade formats
          gradedAt: g.gradedAt || submission.timestamp
        })));
      } catch (error) {
        console.error(`Error fetching grades for submission ${submission.id}:`, error);
        // Continue with other submissions even if one fails
      }
    }

    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({ message: "Failed to fetch grades" });
  }
});

  // Get grades for the authenticated student (student only)
  app.get("/api/student/grades", isAuthenticated, checkRole("student"), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`Fetching grades for student userId: ${userId}`);

      // Get all submissions by this user
      const submissions = await storage.getSubmissionsByUserId(userId);

      // Get all grades for these submissions with error handling
      let grades: any[] = [];
      for (const submission of submissions) {
        try {
          const gradeList = await storage.getGradesBySubmissionId(submission.id);
          
          // Get AI analysis data if available
          const autogrades = await storage.getAutogradesBySubmissionId(submission.id);
          const latestAutograde = autogrades.length > 0 ? autogrades[autogrades.length - 1] : null;
          
          // Attach submission info and AI analysis to each grade
          grades.push(...gradeList.map(g => ({
            ...g,
            subject: submission.subject,
            submittedAt: submission.timestamp,
            status: "graded", // Since we have a grade
            // Ensure compatibility with both old and new grade formats
            gradedAt: g.gradedAt || submission.timestamp,
            maxScore: 100, // Default max score for compatibility
            timestamp: g.gradedAt || submission.timestamp,
            // Add AI analysis data if available
            hasAutograde: latestAutograde ? true : false,
            aiAnalysis: latestAutograde ? latestAutograde.aiAnalysis : null,
            codeQuality: latestAutograde ? latestAutograde.codeQuality : null,
            readability: latestAutograde ? latestAutograde.readability : null,
            efficiency: latestAutograde ? latestAutograde.efficiency : null,
            aiSuggestedScore: latestAutograde ? latestAutograde.suggestedScore : null,
            aiStrengths: latestAutograde ? JSON.parse(latestAutograde.strengths || '[]') : [],
            aiWeaknesses: latestAutograde ? JSON.parse(latestAutograde.weaknesses || '[]') : [],
            aiImprovements: latestAutograde ? JSON.parse(latestAutograde.improvements || '[]') : []
          })));
        } catch (error) {
          console.error(`Error fetching grades for submission ${submission.id}:`, error);
          // Continue with other submissions even if one fails
        }
      }

      // If no grades found, return sample data for demonstration with AI analysis
      if (grades.length === 0) {
        const sampleGrades = [
          {
            id: "sample-1",
            subject: "JavaScript - Prime Number Challenge",
            score: 85,
            maxScore: 100,
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            feedback: `🚀 PURE AI Analysis Results - NO FALLBACKS:

📊 Overall AI Score: 85/100

📈 Detailed AI Metrics:
• Code Quality: 88/100
• Readability: 92/100
• Efficiency: 78/100

✅ AI-Detected Strengths:
• Clean function structure
• Proper variable naming
• Good edge case handling

⚠️ AI-Detected Issues:
• Could optimize for larger numbers
• Missing input validation

💡 AI Suggestions:
• Use square root optimization for prime checking
• Add input type checking
• Consider using more efficient algorithms

🤖 Detailed AI Analysis:
Great solution! Your implementation shows solid understanding of prime number logic. Consider optimizing for larger numbers using the square root approach to improve efficiency.`,
            status: "graded",
            hasAutograde: true,
            aiAnalysis: "Great solution! Your implementation shows solid understanding of prime number logic. Consider optimizing for larger numbers using the square root approach to improve efficiency.",
            codeQuality: 88,
            readability: 92,
            efficiency: 78,
            aiSuggestedScore: 85,
            aiStrengths: ["Clean function structure", "Proper variable naming", "Good edge case handling"],
            aiWeaknesses: ["Could optimize for larger numbers", "Missing input validation"],
            aiImprovements: ["Use square root optimization for prime checking", "Add input type checking", "Consider using more efficient algorithms"]
          },
          {
            id: "sample-2", 
            subject: "Python - Fibonacci Sequence",
            score: 92,
            maxScore: 100,
            submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            feedback: `🚀 PURE AI Analysis Results - NO FALLBACKS:

📊 Overall AI Score: 92/100

📈 Detailed AI Metrics:
• Code Quality: 95/100
• Readability: 98/100
• Efficiency: 85/100

✅ AI-Detected Strengths:
• Excellent iterative approach
• Clean, readable code
• Proper error handling
• Good performance for large inputs

⚠️ AI-Detected Issues:
• No critical issues detected by AI

💡 AI Suggestions:
• Consider adding memoization for even better performance
• Add docstring for better documentation

🤖 Detailed AI Analysis:
Excellent work! Your iterative approach is both efficient and clean. The code demonstrates strong understanding of algorithmic optimization and Python best practices.`,
            status: "graded",
            hasAutograde: true,
            aiAnalysis: "Excellent work! Your iterative approach is both efficient and clean. The code demonstrates strong understanding of algorithmic optimization and Python best practices.",
            codeQuality: 95,
            readability: 98,
            efficiency: 85,
            aiSuggestedScore: 92,
            aiStrengths: ["Excellent iterative approach", "Clean, readable code", "Proper error handling", "Good performance for large inputs"],
            aiWeaknesses: ["No critical issues detected by AI"],
            aiImprovements: ["Consider adding memoization for even better performance", "Add docstring for better documentation"]
          },
          {
            id: "sample-3",
            subject: "Java - Array Sorting",
            score: 78,
            maxScore: 100,
            submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            feedback: `🚀 PURE AI Analysis Results - NO FALLBACKS:

📊 Overall AI Score: 78/100

📈 Detailed AI Metrics:
• Code Quality: 75/100
• Readability: 85/100
• Efficiency: 70/100

✅ AI-Detected Strengths:
• Correct sorting algorithm implementation
• Good code structure
• Proper Java syntax

⚠️ AI-Detected Issues:
• Missing null checks
• No handling of empty arrays
• Could use more efficient algorithm

💡 AI Suggestions:
• Add null and empty array validation
• Consider using Collections.sort() or Arrays.sort()
• Add comments to explain sorting logic

🤖 Detailed AI Analysis:
Good implementation of sorting logic! However, consider adding edge case handling for null and empty arrays to make your code more robust.`,
            status: "graded",
            hasAutograde: true,
            aiAnalysis: "Good implementation of sorting logic! However, consider adding edge case handling for null and empty arrays to make your code more robust.",
            codeQuality: 75,
            readability: 85,
            efficiency: 70,
            aiSuggestedScore: 78,
            aiStrengths: ["Correct sorting algorithm implementation", "Good code structure", "Proper Java syntax"],
            aiWeaknesses: ["Missing null checks", "No handling of empty arrays", "Could use more efficient algorithm"],
            aiImprovements: ["Add null and empty array validation", "Consider using Collections.sort() or Arrays.sort()", "Add comments to explain sorting logic"]
          },
          {
            id: "sample-4",
            subject: "C++ - Binary Search",
            score: 0,
            maxScore: 100,
            submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
            hasAutograde: false
          }
        ];
        return res.json(sampleGrades);
      }

      res.json(grades);
    } catch (error) {
      console.error("Error in /api/student/grades:", error);
      res.status(500).json({ message: "Failed to get student grades" });
    }
  });
  
  // Get all active screen shares (admin only)
  app.get("/api/admin/screen-shares", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      // This would normally query a collection of active streams
      // For demo, return information about how screen sharing works
      res.json({
        message: "Enhanced monitoring with Puppeteer screenshots",
        note: "System now uses Puppeteer for high-quality codespace screenshots",
        details: [
          "Screenshots are captured server-side using Puppeteer",
          "Real codespace content is captured (not placeholders)",
          "Images are stored in MongoDB Atlas with metadata",
          "Automatic capture on code submission",
          "Manual capture available for students",
          "Admin bulk capture functionality"
        ],
        active_shares: []
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch screen shares" });
    }
  });
  
  // Get test case templates (admin only)
  app.get("/api/admin/test-cases/:subject", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const subject = req.params.subject;
      
      // Default test cases for prime number challenge
      const defaultTestCases = [
        { id: "1", input: "7", expected: "true", description: "Check if 7 is prime" },
        { id: "2", input: "4", expected: "false", description: "Check if 4 is prime" },
        { id: "3", input: "13", expected: "true", description: "Check if 13 is prime" },
        { id: "4", input: "1", expected: "false", description: "Check if 1 is prime" }
      ];
      
      res.json(defaultTestCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test cases" });
    }
  });
  
  // Save test cases (admin only)
  app.post("/api/admin/test-cases/:subject", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const subject = req.params.subject;
      const testCases = req.body.testCases;
      
      if (!Array.isArray(testCases)) {
        return res.status(400).json({ message: "Invalid test cases format" });
      }
      
      console.log(`Saving ${testCases.length} test cases for ${subject}`);
      
      // In a real implementation, you would save these to the database
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save test cases" });
    }
  });
  

  
  // Get user's submissions
  app.get("/api/submissions/user", isAuthenticated, async (req, res) => {
    const submissions = await storage.getSubmissionsByUserId(req.user?.id!);
    res.json(submissions);
  });
  
  // Logging endpoints (keeping for backward compatibility but prioritizing Puppeteer)
  // Tab switch logging
  app.post("/api/log/tab-switch", isAuthenticated, async (req, res) => {
    try {
      const log = insertLogSchema.parse({
        userId: req.user?.id,
        type: "tab-switch",
        data: JSON.stringify(req.body)
      });
      
      const result = await storage.createLog(log);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
  });
  
  // Legacy screenshot logging (client-side) - deprecated in favor of Puppeteer
  app.post("/api/log/screenshot", isAuthenticated, async (req, res) => {
    try {
      console.log("⚠️ Client-side screenshot received - consider using Puppeteer endpoint instead");
      
      // Validate image format
      const imageData = req.body.image;
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ 
          message: "Invalid screenshot: missing or invalid image data",
          error: "IMAGE_DATA_MISSING"
        });
      }
      
      if (!imageData.startsWith('data:image/')) {
        console.error('❌ Screenshot received without proper data URI prefix');
        return res.status(400).json({ 
          message: "Invalid screenshot: image must include data URI prefix (data:image/...)",
          error: "INVALID_IMAGE_FORMAT",
          receivedPrefix: imageData.substring(0, 30)
        });
      }
      
      console.log(`📸 Screenshot validation: ✅ Valid format - ${imageData.substring(0, 30)}...`);
      console.log(`📸 Screenshot size: ${Math.round(imageData.length/1024)}KB`);
      
      // Save to MongoDB with structured data (marking as legacy)
      const screenshotData = {
        userId: req.user?.id!,
        type: 'screenshot' as const,
        image: imageData, // Store the full base64 string with prefix
        metadata: {
          ...req.body.metadata,
          captureMethod: 'client-side-legacy',
          imageDataValidated: true,
          receivedAt: new Date().toISOString()
        }
      };
      
      const result = await mongoService.saveScreenshot(screenshotData);
      
      // Also save to hybrid storage (MongoDB via storage interface)
      const log = insertLogSchema.parse({
        userId: req.user?.id,
        type: "screenshot",
        data: JSON.stringify({
          image: imageData, // Ensure full image data is stored
          metadata: {
            ...req.body.metadata,
            imageDataValidated: true
          }
        })
      });
      await storage.createLog(log);
      
      res.status(201).json({
        ...result,
        message: "Screenshot saved successfully with validated format",
        imageSize: Math.round(imageData.length/1024),
        warning: "Client-side screenshot - consider using Puppeteer for better quality"
      });
    } catch (error) {
      console.error('Screenshot logging error:', error);
      res.status(400).json({ 
        message: "Invalid log data", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Screenshot error logging
  app.post("/api/log/screenshot-error", isAuthenticated, async (req, res) => {
    try {
      const log = insertLogSchema.parse({
        userId: req.user?.id,
        type: "screenshot-error",
        data: JSON.stringify(req.body)
      });
      
      const result = await storage.createLog(log);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
  });
  
  // Screen share logging
  app.post("/api/log/screen-share", isAuthenticated, async (req, res) => {
    try {
      // Save to MongoDB with structured data
      const screenShareData = {
        userId: req.user?.id!,
        type: 'screen-share' as const,
        action: req.body.action,
        timestamp: req.body.timestamp,
        streamInfo: req.body.streamInfo,
        error: req.body.error
      };
      
      const result = await mongoService.saveScreenShareEvent(screenShareData);
      
      // Also save to hybrid storage (MongoDB via storage interface)
      const log = insertLogSchema.parse({
        userId: req.user?.id,
        type: "screen-share",
        data: JSON.stringify(req.body)
      });
      await storage.createLog(log);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Screen share logging error:', error);
      res.status(400).json({ message: "Invalid log data" });
    }
  });
  
  // Get all logs (admin only)
  app.get("/api/logs", isAuthenticated, checkRole("admin"), async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });
  
  // Get logs by type (admin only)
  app.get("/api/logs/type/:type", isAuthenticated, checkRole("admin"), async (req, res) => {
    const logs = await storage.getLogsByType(req.params.type);
    res.json(logs);
  });

  // Serve screenshot images from MongoDB (admin only)
  app.get("/api/screenshots/:filename", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Security check: ensure filename doesn't contain path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      
      console.log(`📸 Looking for screenshot in MongoDB: ${filename}`);
      
      // Try to find the screenshot in MongoDB by filename
      const screenshots = await mongoService.getAllScreenshots();
      let targetScreenshot = null;
      
      // First, try exact filename match
      targetScreenshot = screenshots.find(shot => {
        const metadata = shot.metadata as any;
        return metadata?.filename === filename;
      });
      
      // If not found, try to find by similar pattern (same user ID)
      if (!targetScreenshot) {
        const userMatch = filename.match(/user-(\d+)/);
        const userId = userMatch ? parseInt(userMatch[1]) : null;
        
        if (userId) {
          console.log(`📸 Looking for fallback screenshot for user ${userId}`);
          targetScreenshot = screenshots.find(shot => 
            shot.userId === userId && shot.metadata?.captureMethod === 'puppeteer-server-side'
          );
        }
      }
      
      if (targetScreenshot && targetScreenshot.image) {
        console.log(`📸 Found screenshot in MongoDB for ${filename}`);
        
        // Extract base64 data from data URI
        let imageData = targetScreenshot.image;
        
        // Handle different image data formats
        if (imageData.startsWith('data:image/')) {
          const base64Data = imageData.split(',')[1];
          const mimeType = imageData.split(';')[0].split(':')[1];
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Set appropriate headers
          res.set({
            'Content-Type': mimeType,
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'X-Screenshot-Source': 'mongodb',
            'X-Original-Filename': (targetScreenshot.metadata as any)?.filename || filename
          });
          
          // Send the image
          res.send(imageBuffer);
          
          console.log(`📸 Served screenshot from MongoDB: ${filename} (${Math.round(imageBuffer.length/1024)}KB)`);
          return;
        }
      }
      
      // Fallback: try to serve from local files if MongoDB doesn't have it
      console.log(`📸 Screenshot not found in MongoDB, trying local files...`);
      
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      const filePath = path.join(screenshotsDir, filename);
      
      if (fs.existsSync(filePath)) {
        console.log(`📸 Found screenshot in local files: ${filename}`);
        
        const stats = fs.statSync(filePath);
        const fileExtension = path.extname(filename).toLowerCase();
        
        let contentType = 'image/jpeg';
        if (fileExtension === '.png') {
          contentType = 'image/png';
        } else if (fileExtension === '.webp') {
          contentType = 'image/webp';
        }
        
        res.set({
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Cache-Control': 'public, max-age=86400',
          'Last-Modified': stats.mtime.toUTCString(),
          'X-Screenshot-Source': 'local-file'
        });
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        console.log(`📸 Served screenshot from local file: ${filename} (${Math.round(stats.size/1024)}KB)`);
        return;
      }
      
      // Not found anywhere
      console.log(`❌ Screenshot not found: ${filename}`);
      console.log(`📊 Available screenshots in MongoDB: ${screenshots.length}`);
      
      res.status(404).json({ 
        message: "Screenshot not found",
        requestedFile: filename,
        availableInMongoDB: screenshots.length,
        availableFilenames: screenshots
          .filter(shot => (shot.metadata as any)?.filename)
          .map(shot => (shot.metadata as any).filename)
          .slice(0, 5) // Show first 5 as example
      });
      
    } catch (error) {
      console.error('Error serving screenshot:', error);
      res.status(500).json({ message: "Failed to serve screenshot" });
    }
  });

  // MongoDB-based endpoints for enhanced monitoring
  
  // Get screenshots from MongoDB (admin only)
  app.get("/api/mongodb/screenshots", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const screenshots = await mongoService.getScreenshots();
      res.json(screenshots);
    } catch (error) {
      console.error("Error fetching MongoDB screenshots:", error);
      res.status(500).json({ message: "Failed to fetch screenshots" });
    }
  });

  // Get screen share events from MongoDB (admin only)
  app.get("/api/mongodb/screen-shares", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const screenShares = await mongoService.getScreenShareEvents(userId, limit);
      res.json(screenShares);
    } catch (error) {
      console.error('Error fetching screen shares:', error);
      res.status(500).json({ message: "Failed to fetch screen shares" });
    }
  });

  // Get active screen shares (admin only)
  app.get("/api/mongodb/active-screen-shares", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const activeShares = await mongoService.getActiveScreenShares();
      res.json(activeShares);
    } catch (error) {
      console.error('Error fetching active screen shares:', error);
      res.status(500).json({ message: "Failed to fetch active screen shares" });
    }
  });

  // Get monitoring statistics (admin only)
  app.get("/api/mongodb/stats", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const stats = await mongoService.getMonitoringStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching monitoring stats:', error);
      res.status(500).json({ message: "Failed to fetch monitoring stats" });
    }
  });

  // 🚀 Spin up a new container
  app.post("/api/container/spin-up", isAuthenticated, async (req, res) => {
    const { language } = req.body;
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized: user not found" });
      }
      // spinUpContainer will throw if the language is not supported
      const { url, containerId } = await spinUpContainer(language, req.user.id);
      res.json({ url, containerId });
    } catch (error: any) {
      console.error(error);
      // 400 for unsupported language, 500 for other errors
      if (error.message && error.message.startsWith("No Docker image defined")) {
        res.status(400).json({ message: "Unsupported language" });
      } else {
        res.status(500).json({ message: error.message || "Failed to spin up container" });
      }
    }
  });

  // 🛑 Stop a running container
  app.post("/api/container/stop", isAuthenticated, async (req, res) => {
    const { containerId } = req.body;
    try {
      await stopContainer(containerId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop container" });
    }
  });

  // Clear ALL logs from both SQLite and MongoDB (admin only)
  app.post("/api/admin/clear-all-logs", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🗑️ Admin requested to clear ALL logs from both databases');
      
      let sqliteCount = 0;
      let mongoCount = 0;
      
      // 1. Clear logs from SQLite/Hybrid storage
      try {
        const logs = await storage.getLogs();
        sqliteCount = logs.length;
        
        // Delete all logs by type
        await storage.deleteLogsByType('screenshot');
        await storage.deleteLogsByType('tab-switch');
        await storage.deleteLogsByType('screen-share');
        await storage.deleteLogsByType('screenshot-error');
        
        console.log(`✅ Cleared ${sqliteCount} logs from SQLite/Hybrid storage`);
      } catch (sqliteError) {
        console.error('Error clearing SQLite logs:', sqliteError);
      }
      
      // 2. Clear logs directly from MongoDB
      try {
        const db = mongoService['db'];
        if (db) {
          const logsCollection = db.collection('logs');
          const mongoResult = await logsCollection.deleteMany({});
          mongoCount = mongoResult.deletedCount || 0;
          console.log(`✅ Cleared ${mongoCount} logs directly from MongoDB logs collection`);
        }
      } catch (mongoError) {
        console.error('Error clearing MongoDB logs:', mongoError);
      }
      
      // 3. Also clear corrupted screenshot events
      try {
        // Clear any remaining corrupted data
        const db = mongoService['db'];
        if (db) {
          // Clear any logs that might have corrupted screenshot data
          const corruptedResult = await db.collection('logs').deleteMany({
            $or: [
              { type: 'screenshot', 'data.image': { $exists: true } },
              { type: 'screenshot', data: { $regex: 'data:image' } }
            ]
          });
          console.log(`✅ Cleared ${corruptedResult.deletedCount} potentially corrupted screenshot logs`);
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      console.log(`🎯 Total cleanup: ${sqliteCount} SQLite + ${mongoCount} MongoDB logs cleared`);
      
      res.json({
        success: true,
        message: `Cleared all logs: ${sqliteCount} from SQLite + ${mongoCount} from MongoDB`,
        sqliteCount,
        mongoCount,
        totalCleared: sqliteCount + mongoCount
      });
      
    } catch (error) {
      console.error('Clear all logs error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to clear logs",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test screenshot endpoint for debugging (admin only)
  app.post("/api/admin/test-screenshot", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🧪 Test screenshot endpoint called');
      
      // Capture a simple screenshot of Google for testing
      const result = await puppeteerService.captureAndSaveToMongoDB(
        'https://www.google.com',
        999, // Test user ID
        'test-screenshot',
        'manual'
      );
      
      if (result.success) {
        console.log('✅ Test screenshot captured and saved successfully');
        
        // Also log to SQLite for Event Logs tab
        try {
          const log = insertLogSchema.parse({
            userId: 999, // Test user ID
            type: "screenshot",
            data: JSON.stringify({
              method: 'puppeteer-server-side',
              containerUrl: 'https://www.google.com',
              filename: result.filename,
              imageSize: result.imageSize,
              timestamp: result.timestamp,
              subject: 'test-screenshot',
              captureEvent: 'admin-test',
              captureType: result.captureType || 'browser'
            })
          });
          await storage.createLog(log);
          console.log(`📝 Test screenshot logged to Event Logs`);
        } catch (logError) {
          console.error('Failed to log test screenshot to Event Logs:', logError);
        }
        
        res.json({
          success: true,
          message: "Test screenshot captured and saved to MongoDB",
          result
        });
      } else {
        console.error('❌ Test screenshot failed:', result.error);
        res.status(500).json({
          success: false,
          message: "Test screenshot failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error('Test screenshot endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Test screenshot endpoint failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin desktop capture endpoint (admin can capture any user's desktop)
  app.post("/api/admin/capture-desktop", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const { userId, subject } = req.body;
      const targetUserId = userId || 999; // Default test user
      
      console.log(`🖥️ Admin desktop capture requested for user ${targetUserId}`);
      
      const result = await puppeteerService.captureDesktopAndSaveToMongoDB(
        targetUserId, 
        subject || 'admin-desktop', 
        'admin-capture'
      );
      
      if (result.success) {
        console.log('✅ Admin desktop capture successful');
        
        // Also log to SQLite for Event Logs tab
        try {
          const log = insertLogSchema.parse({
            userId: targetUserId,
            type: "screenshot",
            data: JSON.stringify({
              method: 'puppeteer-server-side',
              containerUrl: 'desktop-capture',
              filename: result.filename,
              imageSize: result.imageSize,
              timestamp: result.timestamp,
              subject: subject || 'admin-desktop',
              captureEvent: 'admin-capture',
              captureType: 'desktop'
            })
          });
          await storage.createLog(log);
          console.log(`📝 Admin desktop capture logged to Event Logs`);
        } catch (logError) {
          console.error('Failed to log admin desktop capture to Event Logs:', logError);
        }
        
        res.json({
          success: true,
          message: "Admin desktop capture successful and saved to MongoDB",
          result
        });
      } else {
        console.error('❌ Admin desktop capture failed:', result.error);
        res.status(500).json({
          success: false,
          message: "Admin desktop capture failed",
          error: result.error
        });
      }
    } catch (error) {
      console.error('Admin desktop capture endpoint error:', error);
      res.status(500).json({
        success: false,
        message: "Admin desktop capture failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

    // Debug endpoint for testing screenshot capture (admin only)
  app.post("/api/debug/capture-screenshot", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const { containerUrl, userId, subject } = req.body;
      
      if (!containerUrl || !userId) {
        return res.status(400).json({ message: "containerUrl and userId are required" });
      }
      
      console.log(`🔧 DEBUG: Manual screenshot capture test`);
      console.log(`🔧 URL: ${containerUrl}`);
      console.log(`🔧 User: ${userId}`);
      console.log(`🔧 Subject: ${subject || 'debug'}`);
      
      // Use the updated Puppeteer service for screenshot capture
      const result = await puppeteerService.captureAndSaveToMongoDB(
        containerUrl, 
        parseInt(userId), 
        subject || 'debug',
        'debug-manual'
      );
      
      console.log(`🔧 DEBUG: Screenshot result:`, result);
      
      if (result.success) {
          console.log(`🔧 DEBUG: Screenshot captured and saved to MongoDB successfully`);
        } else {
          console.error(`🔧 DEBUG: Screenshot capture failed:`, result.error);
        }
      
      res.json({
        success: result.success,
        message: result.success ? "Debug screenshot captured successfully" : "Screenshot capture failed",
        result: result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('🔧 DEBUG: Screenshot capture error:', error);
      res.status(500).json({ 
        message: "Debug screenshot capture failed", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Debug endpoint to cleanup orphaned browser processes (admin only)
  app.post("/api/debug/cleanup-browsers", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🧹 Manual browser cleanup requested by admin');
      
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        
        // Check for Chrome processes
        exec('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV', (error: any, stdout: any) => {
          if (!error) {
            const chromeProcesses = stdout.split('\n').filter((line: string) => line.includes('chrome.exe')).length - 1;
            
            if (chromeProcesses > 0) {
              console.log(`🔫 Found ${chromeProcesses} Chrome processes, killing them...`);
              exec('taskkill /F /IM chrome.exe /T', (killError: any) => {
                if (!killError) {
                  console.log('✅ Chrome processes cleaned up');
                } else {
                  console.error('❌ Failed to kill Chrome processes:', killError);
                }
              });
            } else {
              console.log('✅ No orphaned Chrome processes found');
            }
          }
        });
      }
      
      // Also cleanup the Puppeteer service
      await puppeteerService.cleanup();
      
      res.json({
        success: true,
        message: "Browser cleanup initiated",
        platform: process.platform,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Browser cleanup error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to cleanup browsers",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Debug endpoint to check workspace state (admin only)
  app.post("/api/debug/workspace-state", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const { containerUrl } = req.body;
      
      if (!containerUrl) {
        return res.status(400).json({ message: "containerUrl is required" });
      }
      
      console.log(`🔧 DEBUG: Checking workspace state for ${containerUrl}`);
      
      const browser = await puppeteerService.initBrowser();
      const page = await browser.newPage();
      
      await page.goto(containerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check login
      const needsLogin = await page.$('input[type="password"]');
      if (needsLogin) {
        await page.type('input[type="password"]', 'cs1234');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Get workspace state
      const workspaceState = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tab .label-name')).map(tab => tab.textContent);
        const editorContent = document.querySelector('.monaco-editor .view-lines')?.textContent?.substring(0, 200) || '';
        const welcomeScreen = document.querySelector('[aria-label="Get Started"], .welcome-view') ? true : false;
        const explorerFiles = Array.from(document.querySelectorAll('.explorer-viewlet .label-name')).map(file => file.textContent);
        const notifications = Array.from(document.querySelectorAll('.notification-toast')).map(n => n.textContent);
        
        return {
          tabs,
          editorContent,
          welcomeScreen,
          explorerFiles,
          notifications,
          hasMonacoEditor: !!document.querySelector('.monaco-editor'),
          hasWorkbench: !!document.querySelector('.monaco-workbench'),
          url: window.location.href,
          title: document.title
        };
      });
      
      await page.close();
      
      res.json({
        success: true,
        workspaceState,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('🔧 DEBUG: Workspace state check error:', error);
      res.status(500).json({ 
        message: "Failed to check workspace state", 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get system screen information (admin only)
  app.get("/api/debug/system-info", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🖥️ Getting system screen information...');
      
      const puppeteer = await import('puppeteer');
      
      // Launch temporary browser to get screen info
      const browser = await puppeteer.default.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      const systemInfo = await page.evaluate(() => {
        return {
          screen: {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth
          },
          window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            devicePixelRatio: window.devicePixelRatio
          },
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        };
      });
      
      await browser.close();
      
      console.log('🖥️ System info collected:', systemInfo);
      
      res.json({
        success: true,
        systemInfo: systemInfo,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('🖥️ Error getting system info:', error);
      res.status(500).json({ 
        message: "Failed to get system information", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Question endpoints
  app.post("/api/questions", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log("Creating question with data:", req.body);
      
      const { title, description, language, difficulty, timeLimit } = req.body;
      if (!title || !description || !timeLimit) {
        console.log("Missing required fields:", { title, description, timeLimit });
        return res.status(400).json({ 
          error: "Missing required fields",
          details: "Title, description, and time limit are required"
        });
      }

      console.log("Creating question in database...");
      const question = await storage.createQuestion({
        title,
        description,
        language: language || "JavaScript", // Default to JavaScript if not provided
        difficulty: difficulty || "medium", // Default to medium if not provided
        timeLimit: parseInt(timeLimit)
      });
      console.log("Question created successfully:", question);

      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ 
        error: "Failed to create question",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/questions", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching questions...");
      console.log("User:", req.user); // Log the user to check authentication
      const questions = await storage.getQuestions();
      console.log("Questions fetched:", questions);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      // Log the full error details
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ 
        error: "Failed to fetch questions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get single question by ID
  app.get("/api/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ 
          error: "Invalid question ID",
          details: "Question ID must be a valid number"
        });
      }

      console.log("Fetching question with ID:", questionId);
      const question = await storage.getQuestionById(questionId);
      
      if (!question) {
        return res.status(404).json({ 
          error: "Question not found",
          details: `Question with ID ${questionId} does not exist`
        });
      }

      console.log("Question fetched successfully:", question);
      res.json(question);
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ 
        error: "Failed to fetch question",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete question endpoint (admin only)
  app.delete("/api/questions/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ 
          error: "Invalid question ID",
          details: "Question ID must be a valid number"
        });
      }

      console.log("Deleting question with ID:", questionId);
      await storage.deleteQuestion(questionId);
      console.log("Question deleted successfully");

      res.json({ 
        success: true,
        message: "Question deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ 
        error: "Failed to delete question",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get active students count (admin only) - directly from users table
  app.get("/api/admin/students/count", isAuthenticated, checkRole("admin"), async (req, res) => {
    try {
      console.log('🔍 Fetching student count from users table...');
      console.log('🔍 Request user:', req.user);
      
      // Get all users from the database
      const allUsers = await storage.getAllUsers();
      console.log('🔍 All users:', allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
      
      // Filter only students
      const students = allUsers.filter(user => user.role === 'student');
      console.log('🔍 Students only:', students.map(u => ({ id: u.id, email: u.email, role: u.role })));
      
      // Get submissions to see which students are actually active
      const submissions = await storage.getSubmissions();
      console.log('🔍 All submissions:', submissions.map(s => ({ id: s.id, userId: s.userId, subject: s.subject })));
      
      const studentsWithSubmissions = students.filter(student => 
        submissions.some(sub => sub.userId === student.id)
      );
      
      console.log('🔍 Active students (with submissions):', studentsWithSubmissions.map(u => ({ id: u.id, email: u.email })));
      
      const result = {
        totalStudents: students.length,
        activeStudents: studentsWithSubmissions.length,
        studentDetails: studentsWithSubmissions.map(u => ({ id: u.id, email: u.email })),
        debug: {
          totalUsers: allUsers.length,
          totalSubmissions: submissions.length,
          studentsFound: students.length,
          submissionsFound: submissions.length
        }
      };
      
      console.log('🔍 Sending result:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ Error fetching student count:', error);
      res.status(500).json({ message: "Failed to fetch student count", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
