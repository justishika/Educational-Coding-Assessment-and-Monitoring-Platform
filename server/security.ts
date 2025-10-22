import { Request, Response, NextFunction } from 'express';

// Security configuration
export const securityConfig = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
  
  // Attack patterns to block
  suspiciousPatterns: [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /drop.*table/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /onload/i,  // Event handler injection
    /eval\(/i,  // Code injection
    /expression\(/i,  // CSS injection
    /vbscript:/i,  // VBScript injection
    /data:text\/html/i,  // Data URI injection
  ],
  
  // Blocked API documentation paths
  blockedPaths: [
    '/api-docs',
    '/swagger',
    '/docs',
    '/api',
    '/openapi.json',
    '/graphql',
    '/graphiql',
  ],
  
  // File upload restrictions
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.js', '.py', '.java', '.cpp', '.c', '.ts', '.jsx', '.tsx'],
    blockedTypes: ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.php', '.asp', '.jsp'],
  }
};

// Security middleware factory
export function createSecurityMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set security headers
    Object.entries(securityConfig.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Hide server information
    res.removeHeader('X-Powered-By');
    
    next();
  };
}

// Attack pattern detection middleware
export function createAttackDetectionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.url.toLowerCase();
    const body = JSON.stringify(req.body || {}).toLowerCase();
    const query = JSON.stringify(req.query || {}).toLowerCase();
    
    // Check for suspicious patterns
    for (const pattern of securityConfig.suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body) || pattern.test(query)) {
        console.log(`🚨 Blocked suspicious request: ${req.method} ${req.url}`);
        console.log(`🚨 Pattern matched: ${pattern}`);
        console.log(`🚨 IP: ${req.ip || req.connection.remoteAddress}`);
        
        return res.status(400).json({ 
          error: 'Invalid request detected',
          message: 'Request blocked for security reasons',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
  };
}

// API path blocking middleware
export function createPathBlockingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path.toLowerCase();
    
    if (securityConfig.blockedPaths.includes(path)) {
      console.log(`🚨 Blocked access to restricted path: ${path}`);
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'API documentation is not publicly available',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

// Request logging middleware
export function createRequestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms IP:${ip}`;
      
      if (res.statusCode >= 400) {
        console.warn(`⚠️  ${logMessage}`);
      } else {
        console.log(`✅ ${logMessage}`);
      }
    });
    
    next();
  };
}
