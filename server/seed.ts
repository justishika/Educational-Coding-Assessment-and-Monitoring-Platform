import { db } from "./db";
import { users } from "@shared/schema";

async function seedDatabase() {
  console.log("Seeding database...");
  
  // Check if users already exist
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length === 0) {
    // Insert demo users
    await db.insert(users).values([
      {
        email: "student@lab.com",
        password: "student123",
        role: "student"
      },
      {
        email: "admin@lab.com",
        password: "admin123",
        role: "admin"
      }
    ]);
    console.log("Demo users created successfully");
  } else {
    console.log("Users already exist, skipping seed");
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log("Database seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });