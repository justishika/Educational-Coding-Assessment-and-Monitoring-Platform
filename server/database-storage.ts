import { 
  users, type User, type InsertUser,
  submissions, type Submission, type InsertSubmission,
  fileSubmissions, type FileSubmission, type InsertFileSubmission,
  logs, type Log, type InsertLog,
  questions, type Question, type InsertQuestion,
  grades, type Grade, type InsertGrade,
  autogrades, type Autograde, type InsertAutograde
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import { IStorage } from "./storage";
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any for session store type

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Submission methods
  async getSubmissions(): Promise<Submission[]> {
    return await db.select().from(submissions);
  }

  async getSubmissionsByUserId(userId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.userId, userId));
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(insertSubmission).returning();
    return submission;
  }

  // File submission methods
  async createFileSubmission(insertFileSubmission: InsertFileSubmission): Promise<FileSubmission> {
    const [fileSubmission] = await db.insert(fileSubmissions).values(insertFileSubmission).returning();
    return fileSubmission;
  }

  async getFileSubmissionsBySubmissionId(submissionId: number): Promise<FileSubmission[]> {
    return await db.select().from(fileSubmissions).where(eq(fileSubmissions.submissionId, submissionId));
  }

  async getFileSubmissionById(id: number): Promise<FileSubmission | undefined> {
    const [fileSubmission] = await db.select().from(fileSubmissions).where(eq(fileSubmissions.id, id));
    return fileSubmission;
  }

  // Log methods
  async getLogs(): Promise<Log[]> {
    return await db.select().from(logs);
  }

  async getLogsByUserId(userId: number): Promise<Log[]> {
    return await db.select().from(logs).where(eq(logs.userId, userId));
  }

  async getLogsByType(type: string): Promise<Log[]> {
    return await db.select().from(logs).where(eq(logs.type, type));
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const [log] = await db.insert(logs).values(insertLog).returning();
    return log;
  }

  async deleteLogsByType(type: string): Promise<number> {
    const result = await db.delete(logs).where(eq(logs.type, type));
    return result.rowCount || 0;
  }

  async clearAllLogs(): Promise<number> {
    const result = await db.delete(logs);
    return result.rowCount || 0;
  }

  // Question methods
  async createQuestion(question: InsertQuestion): Promise<Question> {
    try {
      console.log("Creating question:", question);
      const [result] = await db.insert(questions).values(question).returning();
      console.log("Created question:", result);
      return result;
    } catch (error) {
      console.error("Error creating question:", error);
      throw error;
    }
  }

  async getQuestions(): Promise<Question[]> {
    try {
      console.log("DatabaseStorage: Fetching questions from database");
      const result = await db.select().from(questions);
      console.log("DatabaseStorage: Questions fetched:", result);
      return result;
    } catch (error) {
      console.error("DatabaseStorage: Error fetching questions:", error);
      throw error;
    }
  }

  async getQuestionById(id: number): Promise<Question | null> {
    try {
      console.log("Getting question by ID:", id);
      const [question] = await db.select().from(questions).where(eq(questions.id, id));
      console.log("Found question:", question);
      return question || null;
    } catch (error) {
      console.error("Error getting question by ID:", error);
      throw error;
    }
  }

  async updateQuestion(id: number, question: Partial<InsertQuestion>): Promise<Question> {
    const [result] = await db.update(questions)
      .set(question)
      .where(eq(questions.id, id))
      .returning();
    return result;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }
  
async createGrade(grade: InsertGrade): Promise<Grade> {
  const [created] = await db.insert(grades).values(grade).returning();
  return created;
}

async getGrades(): Promise<Grade[]> {
  return db.select().from(grades);
}

async getGradesBySubmissionId(submissionId: number): Promise<Grade[]> {
  return db.select().from(grades).where(eq(grades.submissionId, submissionId));
}

  async getGradesByUserId(userId: number): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.userId, userId));
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id));
    return result[0];
  }

  // Autograde methods (AI-based)
  async createAutograde(insertAutograde: InsertAutograde): Promise<Autograde> {
    const [autograde] = await db.insert(autogrades).values(insertAutograde).returning();
    return autograde;
  }

  async getAutogrades(): Promise<Autograde[]> {
    return await db.select().from(autogrades);
  }

  async getAutogradesByUserId(userId: number): Promise<Autograde[]> {
    return await db.select().from(autogrades).where(eq(autogrades.userId, userId));
  }

  async getAutogradesBySubmissionId(submissionId: number): Promise<Autograde[]> {
    return await db.select().from(autogrades).where(eq(autogrades.submissionId, submissionId));
  }

  async getAutogradeById(id: number): Promise<Autograde | undefined> {
    const [autograde] = await db.select().from(autogrades).where(eq(autogrades.id, id));
    return autograde;
  }
}