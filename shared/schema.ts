import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  role: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Submission schema (enhanced with file support)
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  code: text("code").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  hasFile: boolean("has_file").default(false),
  filename: text("filename"),
  fileExtension: text("file_extension"),
  fileSize: integer("file_size")
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  userId: true,
  subject: true,
  code: true,
  hasFile: true,
  filename: true,
  fileExtension: true,
  fileSize: true
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

// File submissions table for storing actual file content
export const fileSubmissions = pgTable("file_submissions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileContent: text("file_content").notNull(), // Base64 or text content
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow()
});

export const insertFileSubmissionSchema = createInsertSchema(fileSubmissions).pick({
  submissionId: true,
  filename: true,
  originalName: true,
  fileContent: true,
  mimeType: true,
  fileSize: true
});

export type InsertFileSubmission = z.infer<typeof insertFileSubmissionSchema>;
export type FileSubmission = typeof fileSubmissions.$inferSelect;

// Event logs schema
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'tab-switch' | 'screenshot' | 'screen-share'
  data: text("data"), // Optional data field for screenshots, etc.
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

export const insertLogSchema = createInsertSchema(logs).pick({
  userId: true,
  type: true,
  data: true
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type LoginData = z.infer<typeof loginSchema>;

// Question schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  language: text("language").default("JavaScript"), // Programming language: JavaScript, Python, Java, C++, etc.
  difficulty: text("difficulty").default("medium"), // Difficulty level: easy, medium, hard, expert
  timeLimit: integer("time_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  title: true,
  description: true,
  language: true,
  difficulty: true,
  timeLimit: true
}).partial({
  language: true,
  difficulty: true
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// Autogrades table for AI-based grading results
export const autogrades = pgTable("autogrades", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id").notNull(),
  aiAnalysis: text("ai_analysis").notNull(), // AI's detailed analysis of the code
  suggestedScore: integer("suggested_score").notNull(), // 0-100
  strengths: text("strengths"), // JSON array of strengths found by AI
  weaknesses: text("weaknesses"), // JSON array of issues found by AI
  improvements: text("improvements"), // JSON array of suggested improvements
  codeQuality: integer("code_quality").default(0), // 0-100 score for code quality
  readability: integer("readability").default(0), // 0-100 score for readability
  efficiency: integer("efficiency").default(0), // 0-100 score for efficiency
  status: text("status").notNull().default("completed"), // pending, completed, failed
  gradedAt: timestamp("graded_at").notNull().defaultNow()
});

export const insertAutogradeSchema = createInsertSchema(autogrades).pick({
  submissionId: true,
  userId: true,
  aiAnalysis: true,
  suggestedScore: true,
  strengths: true,
  weaknesses: true,
  improvements: true,
  codeQuality: true,
  readability: true,
  efficiency: true,
  status: true
});

export type InsertAutograde = z.infer<typeof insertAutogradeSchema>;
export type Autograde = typeof autogrades.$inferSelect;

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id").notNull(), // student being graded
  score: integer("score").notNull(),
  feedback: text("feedback").notNull(),
  gradedBy: integer("graded_by").notNull(), // admin user id
  gradedAt: timestamp("graded_at").notNull().defaultNow()
});

export const insertGradeSchema = createInsertSchema(grades).pick({
  submissionId: true,
  userId: true,
  score: true,
  feedback: true,
  gradedBy: true,
  gradedAt: true
});

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof grades.$inferSelect;
