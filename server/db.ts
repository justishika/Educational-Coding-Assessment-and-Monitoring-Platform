// database.ts or database-storage.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema'; // keep this as-is if your schema is correct
import { questions } from "@shared/schema";
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Create tables if they don't exist
async function createTables() {
  try {
    // Test if questions table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'questions'
      );
    `);
    console.log("Questions table exists:", tableExists);

    if (!tableExists) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          time_limit INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Questions table created");
    }

    // Verify table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'questions';
    `);
    console.log("Questions table structure:", tableInfo);
  } catch (error) {
    console.error("Error creating tables:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

async function verifyQuestionsTable() {
  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'questions'
      );
    `);
    console.log("Questions table exists:", tableExists);

    if (!tableExists) {
      console.log("Creating questions table...");
      await db.execute(sql`
        CREATE TABLE questions (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          time_limit INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Questions table created");
    }

    // Verify table structure
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'questions'
      ORDER BY ordinal_position;
    `);
    console.log("Questions table structure:", columns);

    // Try to insert a test question
    try {
      const [testQuestion] = await db.insert(questions).values({
        title: "Test Question",
        description: "This is a test question",
        timeLimit: 30
      }).returning();
      console.log("Test question inserted successfully:", testQuestion);
      
      // Clean up test question
      await db.delete(questions).where(eq(questions.id, testQuestion.id));
      console.log("Test question deleted");
    } catch (error) {
      console.error("Error inserting test question:", error);
    }
  } catch (error) {
    console.error("Error verifying questions table:", error);
  }
}

// Initialize database connection and tables
async function initializeDatabase() {
  try {
    // Test database connection
    await pool.connect().then((client) => {
      console.log("Successfully connected to the database");
      client.release();
    });
    
    await createTables();
    await verifyQuestionsTable();
    await migrateExistingData();
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Migrate existing data to new schema
async function migrateExistingData() {
  try {
    console.log("🔄 Checking for data migration needs...");
    
    // Check if autogrades table exists and has old structure
    const autogradesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'autogrades'
      );
    `);
    
    if (autogradesExists.rows[0]?.exists) {
      console.log("📊 Autogrades table exists, checking schema...");
      
      // Check if we have old test-based autogrades
      const hasOldColumns = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'autogrades' 
        AND column_name IN ('total_tests', 'passed_tests', 'failed_tests', 'test_results');
      `);
      
      if (hasOldColumns.rows.length > 0) {
        console.log("🔄 Migrating old autograde data to new AI-based schema...");
        
        // Update old autogrades to have AI-compatible fields
        await db.execute(sql`
          UPDATE autogrades 
          SET 
            ai_analysis = COALESCE(ai_analysis, 'Migrated from test-based autograde'),
            code_quality = COALESCE(code_quality, LEAST(100, suggested_score + 10)),
            readability = COALESCE(readability, LEAST(100, suggested_score + 5)),
            efficiency = COALESCE(efficiency, LEAST(100, suggested_score)),
            strengths = COALESCE(strengths, '["Legacy autograde data"]'),
            weaknesses = COALESCE(weaknesses, '["Migrated from old system"]'),
            improvements = COALESCE(improvements, '["Consider resubmitting for new AI analysis"]')
          WHERE ai_analysis IS NULL OR ai_analysis = '';
        `);
        
        console.log("✅ Old autograde data migrated successfully");
      }
    }
    
    // Check if grades table has old schema
    const gradesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'grades'
      );
    `);
    
    if (gradesExists.rows[0]?.exists) {
      // Check if we have the old is_autograde_approved column
      const hasOldGradeColumns = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'grades' 
        AND column_name = 'is_autograde_approved';
      `);
      
      if (hasOldGradeColumns.rows.length > 0) {
        console.log("🔄 Removing deprecated grade columns...");
        // The column removal should be handled by schema migration
        // For now, we'll just log that we found it
        console.log("⚠️ Found deprecated is_autograde_approved column - schema should be updated");
      }
    }
    
    console.log("✅ Database migration check completed");
  } catch (error) {
    console.error("❌ Error during database migration:", error);
    // Don't throw - continue with initialization even if migration fails
  }
}

// Cleanup function to close database connections
async function closeDatabase() {
  try {
    await pool.end();
    console.log("Database connection pool closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
}

export { db, pool, initializeDatabase, closeDatabase };
