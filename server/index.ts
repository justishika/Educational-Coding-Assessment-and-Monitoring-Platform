import express, { type Request, Response, NextFunction } from "express";
import 'dotenv/config';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { cleanupAllContainers } from "./container-manager";
import { mongoService } from "./mongodb";
import { initializeDatabase, closeDatabase } from "./db";

const app = express();
// Increase payload limits for large screenshot data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize MongoDB connection
  try {
    await mongoService.connect();
  } catch (error) {
    log('⚠️ Failed to connect to MongoDB, continuing with PostgreSQL only');
    console.error(error);
  }

  // Initialize PostgreSQL database
  try {
    await initializeDatabase();
  } catch (error) {
    log('⚠️ Failed to initialize PostgreSQL database');
    console.error(error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configurable port (default 3000)
  // this serves both the API and the client.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  server.listen(port, "localhost", () => {
    log(`serving on port ${port}`);
    log(`🚀 Application is running at: http://localhost:${port}`);
  });

  // Handle cleanup on shutdown
  process.on('SIGINT', async () => {
    log('🛑 Received SIGINT, cleaning up...');
    await cleanupAllContainers();
    await mongoService.disconnect();
    await closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('🛑 Received SIGTERM, cleaning up...');
    await cleanupAllContainers();
    await mongoService.disconnect();
    await closeDatabase();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    log(`💥 Uncaught exception: ${error.message}`);
    await cleanupAllContainers();
    await mongoService.disconnect();
    await closeDatabase();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    log(`💥 Unhandled rejection at: ${promise}, reason: ${reason}`);
    await cleanupAllContainers();
    await mongoService.disconnect();
    await closeDatabase();
    process.exit(1);
  });
})();
