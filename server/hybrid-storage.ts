import { 
  users, type User, type InsertUser,
  submissions, type Submission, type InsertSubmission,
  fileSubmissions, type FileSubmission, type InsertFileSubmission,
  logs, type Log, type InsertLog,
  questions, type Question, type InsertQuestion,
  grades, type Grade, type InsertGrade,
  autogrades, type Autograde, type InsertAutograde,
  studentContainer, type StudentContainer, type InsertStudentContainer
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { IStorage } from "./storage";
import { mongoService } from "./mongodb";
import MongoStore from "connect-mongo";
import { DatabaseStorage } from "./database-storage";
import { MemStorage } from "./storage";

export class HybridStorage implements IStorage {
  private dbStorage: DatabaseStorage;
  private memStorage: MemStorage;
  sessionStore: any;

  constructor() {
    this.dbStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
    this.sessionStore = this.dbStorage.sessionStore;
  }

  // ==========================================
  // USER METHODS - PostgreSQL
  // ==========================================
  
  async getUser(id: number): Promise<User | undefined> {
    return await this.dbStorage.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await this.dbStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return await this.dbStorage.createUser(user);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.dbStorage.getAllUsers();
  }

  // ==========================================
  // SUBMISSION METHODS - PostgreSQL
  // ==========================================
  
  async getSubmissions(): Promise<Submission[]> {
    return await this.dbStorage.getSubmissions();
  }

  async getSubmissionsByUserId(userId: number): Promise<Submission[]> {
    return await this.dbStorage.getSubmissionsByUserId(userId);
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    // Store in both PostgreSQL and MongoDB for redundancy
    const dbSubmission = await this.dbStorage.createSubmission(submission);
    
    try {
      await mongoService.storeSubmission({
        id: dbSubmission.id,
        ...submission,
        timestamp: dbSubmission.timestamp
      });
    } catch (error) {
      console.log('MongoDB storage failed, continuing with PostgreSQL only');
    }
    
    return dbSubmission;
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    return await this.dbStorage.getSubmissionById(id);
  }

  // ==========================================
  // FILE SUBMISSION METHODS - PostgreSQL
  // ==========================================
  
  async createFileSubmission(fileSubmission: InsertFileSubmission): Promise<FileSubmission> {
    return await this.dbStorage.createFileSubmission(fileSubmission);
  }

  async getFileSubmissionsBySubmissionId(submissionId: number): Promise<FileSubmission[]> {
    return await this.dbStorage.getFileSubmissionsBySubmissionId(submissionId);
  }

  async getFileSubmissionById(id: number): Promise<FileSubmission | undefined> {
    return await this.dbStorage.getFileSubmissionById(id);
  }

  // ==========================================
  // LOG METHODS - MongoDB
  // ==========================================
  
  async getLogs(): Promise<Log[]> {
    try {
      const mongoLogs = await mongoService.getLogs();
      return mongoLogs.map(log => ({
        id: Math.floor(Math.random() * 1000000), // Generate a temporary ID
        userId: log.userId,
        type: log.type,
        data: log.data,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.getLogs();
    }
  }

  async getLogsByUserId(userId: number): Promise<Log[]> {
    try {
      const mongoLogs = await mongoService.getLogsByUserId(userId);
      return mongoLogs.map(log => ({
        id: Math.floor(Math.random() * 1000000), // Generate a temporary ID
        userId: log.userId,
        type: log.type,
        data: log.data,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.getLogsByUserId(userId);
    }
  }

  async getLogsByType(type: string): Promise<Log[]> {
    try {
      const mongoLogs = await mongoService.getLogsByType(type);
      return mongoLogs.map(log => ({
        id: Math.floor(Math.random() * 1000000), // Generate a temporary ID
        userId: log.userId,
        type: log.type,
        data: log.data,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.getLogsByType(type);
    }
  }

  async createLog(log: InsertLog): Promise<Log> {
    try {
      const mongoLog = await mongoService.storeLog({
        userId: log.userId,
        type: log.type,
        data: log.data || null,
        timestamp: new Date().toISOString()
      });
      return {
        id: Math.floor(Math.random() * 1000000), // Generate a temporary ID
        userId: mongoLog.userId,
        type: mongoLog.type,
        data: mongoLog.data,
        timestamp: new Date(mongoLog.timestamp)
      };
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.createLog(log);
    }
  }

  async deleteLogsByType(type: string): Promise<number> {
    try {
      await mongoService.deleteLogsByType(type);
      return 1; // Return a count indicating success
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.deleteLogsByType(type);
    }
  }

  async clearAllLogs(): Promise<number> {
    try {
      await mongoService.clearAllLogs();
      return 1; // Return a count indicating success
    } catch (error) {
      console.log('MongoDB unavailable, using memory storage for logs');
      return await this.memStorage.clearAllLogs();
    }
  }

  // Question methods
  async createQuestion(question: InsertQuestion): Promise<Question> {
    return await this.dbStorage.createQuestion(question);
  }

  async getQuestions(): Promise<Question[]> {
    return await this.dbStorage.getQuestions();
  }

  async getQuestionById(id: number): Promise<Question | null> {
    return await this.dbStorage.getQuestionById(id);
  }

  async updateQuestion(id: number, question: Partial<InsertQuestion>): Promise<Question> {
    return await this.dbStorage.updateQuestion(id, question);
  }

  async deleteQuestion(id: number): Promise<void> {
    return await this.dbStorage.deleteQuestion(id);
  }
  // hybrid-storage.ts
async createGrade(grade: InsertGrade): Promise<Grade> {
  return this.dbStorage.createGrade(grade);
}

async getGrades(): Promise<Grade[]> {
  return this.dbStorage.getGrades();
}

async getGradesBySubmissionId(submissionId: number): Promise<Grade[]> {
  return this.dbStorage.getGradesBySubmissionId(submissionId);
}

async getGradesByUserId(userId: number): Promise<Grade[]> {
  return this.dbStorage.getGradesByUserId(userId);
}

// Autograde methods (AI-based) - use PostgreSQL for persistent data
async createAutograde(autograde: InsertAutograde): Promise<Autograde> {
  return await this.dbStorage.createAutograde(autograde);
}

async getAutogrades(): Promise<Autograde[]> {
  return await this.dbStorage.getAutogrades();
}

async getAutogradesByUserId(userId: number): Promise<Autograde[]> {
  return await this.dbStorage.getAutogradesByUserId(userId);
}

async getAutogradesBySubmissionId(submissionId: number): Promise<Autograde[]> {
  return await this.dbStorage.getAutogradesBySubmissionId(submissionId);
}

async getAutogradeById(id: number): Promise<Autograde | undefined> {
  return await this.dbStorage.getAutogradeById(id);
}

// ==========================================
// STUDENT CONTAINER METHODS - PostgreSQL
// ==========================================

async createStudentContainer(container: InsertStudentContainer): Promise<StudentContainer> {
  return await this.dbStorage.createStudentContainer(container);
}

async getStudentContainersByUserId(userId: number): Promise<StudentContainer[]> {
  return await this.dbStorage.getStudentContainersByUserId(userId);
}

async getActiveStudentContainers(): Promise<StudentContainer[]> {
  return await this.dbStorage.getActiveStudentContainers();
}

async deleteStudentContainer(containerId: string): Promise<void> {
  return await this.dbStorage.deleteStudentContainer(containerId);
}

async deleteStudentContainersByUserId(userId: number): Promise<void> {
  return await this.dbStorage.deleteStudentContainersByUserId(userId);
}
}