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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Modify the interface with CRUD methods needed
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Submission methods
  getSubmissions(): Promise<Submission[]>;
  getSubmissionsByUserId(userId: number): Promise<Submission[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  
  // File submission methods
  createFileSubmission(fileSubmission: InsertFileSubmission): Promise<FileSubmission>;
  getFileSubmissionsBySubmissionId(submissionId: number): Promise<FileSubmission[]>;
  getFileSubmissionById(id: number): Promise<FileSubmission | undefined>;
  
  // Log methods
  getLogs(): Promise<Log[]>;
  getLogsByUserId(userId: number): Promise<Log[]>;
  getLogsByType(type: string): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  deleteLogsByType(type: string): Promise<number>;
  clearAllLogs(): Promise<number>;
  
  // Session store
  sessionStore: any; // Using any for session store type

  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestions(): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | null>;
  updateQuestion(id: number, question: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;

  // Grade methods
  createGrade(grade: InsertGrade): Promise<Grade>;
  getGrades(): Promise<Grade[]>;
  getGradesByUserId(userId: number): Promise<Grade[]>;
  getGradesBySubmissionId(submissionId: number): Promise<Grade[]>;

  // Autograde methods (AI-based)
  createAutograde(autograde: InsertAutograde): Promise<Autograde>;
  getAutogrades(): Promise<Autograde[]>;
  getAutogradesByUserId(userId: number): Promise<Autograde[]>;
  getAutogradesBySubmissionId(submissionId: number): Promise<Autograde[]>;
  getAutogradeById(id: number): Promise<Autograde | undefined>;

  // Student Container methods
  createStudentContainer(container: InsertStudentContainer): Promise<StudentContainer>;
  getStudentContainersByUserId(userId: number): Promise<StudentContainer[]>;
  getActiveStudentContainers(): Promise<StudentContainer[]>;
  deleteStudentContainer(containerId: string): Promise<void>;
  deleteStudentContainersByUserId(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private submissions: Map<number, Submission>;
  private fileSubmissions: Map<number, FileSubmission>;
  private logs: Map<number, Log>;
  private grades: Map<number, Grade>;
  private autogrades: Map<number, Autograde>;
  private studentContainers: Map<string, StudentContainer>;
  sessionStore: any; // Using any for session store type
  currentUserId: number;
  currentSubmissionId: number;
  currentFileSubmissionId: number;
  currentLogId: number;
  currentGradeId: number;
  currentAutogradeId: number;
  currentStudentContainerId: number;

  constructor() {
    this.users = new Map();
    this.submissions = new Map();
    this.fileSubmissions = new Map();
    this.logs = new Map();
    this.grades = new Map();
    this.autogrades = new Map();
    this.studentContainers = new Map();
    this.sessionStore = {
      get: () => {},
      set: () => {},
      destroy: () => {},
    }; // Mock session store for memory storage
    this.currentUserId = 1;
    this.currentSubmissionId = 1;
    this.currentFileSubmissionId = 1;
    this.currentLogId = 1;
    this.currentGradeId = 1;
    this.currentAutogradeId = 1;
    this.currentStudentContainerId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Submission methods
  async getSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values());
  }

  async getSubmissionsByUserId(userId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(
      (submission) => submission.userId === userId
    );
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = this.currentSubmissionId++;
    const timestamp = new Date();
    const submission: Submission = { 
      ...insertSubmission, 
      id, 
      timestamp,
      hasFile: insertSubmission.hasFile ?? false,
      filename: insertSubmission.filename ?? null,
      fileExtension: insertSubmission.fileExtension ?? null,
      fileSize: insertSubmission.fileSize ?? null
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  // File submission methods
  async createFileSubmission(insertFileSubmission: InsertFileSubmission): Promise<FileSubmission> {
    const id = this.currentFileSubmissionId++;
    const uploadedAt = new Date();
    const fileSubmission: FileSubmission = { ...insertFileSubmission, id, uploadedAt };
    this.fileSubmissions.set(id, fileSubmission);
    return fileSubmission;
  }

  async getFileSubmissionsBySubmissionId(submissionId: number): Promise<FileSubmission[]> {
    return Array.from(this.fileSubmissions.values()).filter(
      (fileSubmission) => fileSubmission.submissionId === submissionId
    );
  }

  async getFileSubmissionById(id: number): Promise<FileSubmission | undefined> {
    return this.fileSubmissions.get(id);
  }

  // Grade methods
  async createGrade(insertGrade: InsertGrade): Promise<Grade> {
    const id = this.currentGradeId++;
    const gradedAt = insertGrade.gradedAt || new Date();
    const grade: Grade = { 
      ...insertGrade, 
      id, 
      gradedAt
    };
    this.grades.set(id, grade);
    return grade;
  }

  async getGrades(): Promise<Grade[]> {
    return Array.from(this.grades.values());
  }

  async getGradesByUserId(userId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(
      (grade) => grade.userId === userId
    );
  }

  async getGradesBySubmissionId(submissionId: number): Promise<Grade[]> {
    return Array.from(this.grades.values()).filter(
      (grade) => grade.submissionId === submissionId
    );
  }

  // Log methods
  async getLogs(): Promise<Log[]> {
    return Array.from(this.logs.values());
  }

  async getLogsByUserId(userId: number): Promise<Log[]> {
    return Array.from(this.logs.values()).filter(
      (log) => log.userId === userId
    );
  }

  async getLogsByType(type: string): Promise<Log[]> {
    return Array.from(this.logs.values()).filter(
      (log) => log.type === type
    );
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    const timestamp = new Date();
    // Create a new object without spreading to avoid type issues
    const log: Log = { 
      id, 
      userId: insertLog.userId,
      type: insertLog.type,
      data: insertLog.data === undefined ? null : insertLog.data,
      timestamp
    };
    this.logs.set(id, log);
    return log;
  }

  async deleteLogsByType(type: string): Promise<number> {
    const toDelete = Array.from(this.logs.values()).filter(
      (log) => log.type === type
    );
    
    toDelete.forEach(log => this.logs.delete(log.id));
    
    return toDelete.length;
  }

  async clearAllLogs(): Promise<number> {
    const count = this.logs.size;
    this.logs.clear();
    return count;
  }

  // Question methods
  async createQuestion(question: InsertQuestion): Promise<Question> {
    throw new Error("Method not implemented");
  }

  async getQuestions(): Promise<Question[]> {
    throw new Error("Method not implemented");
  }

  async getQuestionById(id: number): Promise<Question | null> {
    throw new Error("Method not implemented");
  }

  async updateQuestion(id: number, question: Partial<InsertQuestion>): Promise<Question> {
    throw new Error("Method not implemented");
  }

  async deleteQuestion(id: number): Promise<void> {
    throw new Error("Method not implemented");
  }

  // Autograde methods (AI-based)
  async createAutograde(insertAutograde: InsertAutograde): Promise<Autograde> {
    const id = this.currentAutogradeId++;
    const gradedAt = new Date();
    const autograde: Autograde = { 
      ...insertAutograde, 
      id, 
      gradedAt,
      codeQuality: insertAutograde.codeQuality ?? 0,
      readability: insertAutograde.readability ?? 0,
      efficiency: insertAutograde.efficiency ?? 0,
      strengths: insertAutograde.strengths ?? null,
      weaknesses: insertAutograde.weaknesses ?? null,
      improvements: insertAutograde.improvements ?? null,
      status: insertAutograde.status ?? "completed"
    };
    this.autogrades.set(id, autograde);
    return autograde;
  }

  async getAutogrades(): Promise<Autograde[]> {
    return Array.from(this.autogrades.values());
  }

  async getAutogradesByUserId(userId: number): Promise<Autograde[]> {
    return Array.from(this.autogrades.values()).filter(
      (autograde) => autograde.userId === userId
    );
  }

  async getAutogradesBySubmissionId(submissionId: number): Promise<Autograde[]> {
    return Array.from(this.autogrades.values()).filter(
      (autograde) => autograde.submissionId === submissionId
    );
  }

  async getAutogradeById(id: number): Promise<Autograde | undefined> {
    return this.autogrades.get(id);
  }

  // Student Container methods
  async createStudentContainer(insertContainer: InsertStudentContainer): Promise<StudentContainer> {
    const id = this.currentStudentContainerId++;
    const createdAt = new Date();
    const container: StudentContainer = { 
      ...insertContainer, 
      id, 
      createdAt
    };
    this.studentContainers.set(insertContainer.containerId, container);
    return container;
  }

  async getStudentContainersByUserId(userId: number): Promise<StudentContainer[]> {
    return Array.from(this.studentContainers.values()).filter(
      (container) => container.userId === userId
    );
  }

  async getActiveStudentContainers(): Promise<StudentContainer[]> {
    return Array.from(this.studentContainers.values());
  }

  async deleteStudentContainer(containerId: string): Promise<void> {
    this.studentContainers.delete(containerId);
  }

  async deleteStudentContainersByUserId(userId: number): Promise<void> {
    const userContainers = Array.from(this.studentContainers.values()).filter(
      (container) => container.userId === userId
    );
    userContainers.forEach(container => this.studentContainers.delete(container.containerId));
  }
}

import { DatabaseStorage } from "./database-storage";
import { HybridStorage } from "./hybrid-storage";

// Use HybridStorage: PostgreSQL for users/submissions, MongoDB for logs/sessions
export const storage = new HybridStorage();