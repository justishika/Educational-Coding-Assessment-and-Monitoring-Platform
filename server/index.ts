import express, { type Request, Response, NextFunction } from "express";
import 'dotenv/config';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { cleanupAllContainers } from "./container-manager";
import { mongoService } from "./mongodb";
import { initializeDatabase, closeDatabase } from "./db";
import { 
  createSecurityMiddleware, 
  createAttackDetectionMiddleware, 
  createPathBlockingMiddleware,
  createRequestLoggingMiddleware,
  securityConfig 
} from "./security";

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your .env file');
  process.exit(1);
}

// Security warnings for development
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️  Running in DEVELOPMENT mode - ensure proper security in production');
  if (process.env.JWT_SECRET === 'your_jwt_secret_key') {
    console.warn('⚠️  Using default JWT secret - change this in production!');
  }
}

const app = express();

// Apply security middleware
app.use(createSecurityMiddleware());
app.use(createRequestLoggingMiddleware());
app.use(createPathBlockingMiddleware());

// Rate limiting for API endpoints
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit(securityConfig.rateLimit);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);
app.use('/api', createAttackDetectionMiddleware());

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
  server.listen(port, "0.0.0.0", () => {
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
