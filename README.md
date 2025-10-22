# 🎓 College Coding Lab System

A comprehensive full-stack web application designed for college coding laboratories, featuring real-time monitoring, AI-powered autograding, and advanced anti-cheat capabilities.

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🔧 Development](#-development)
- [🐳 Docker Deployment](#-docker-deployment)
- [📊 Database Schema](#-database-schema)
- [🔐 Security Features](#-security-features)
- [🤖 AI Integration](#-ai-integration)
- [📱 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [📈 CI/CD Pipeline](#-cicd-pipeline)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🎯 Overview

The College Coding Lab System is a modern, feature-rich platform designed to facilitate coding examinations and assessments in educational institutions. It provides a secure, monitored environment for students to complete coding challenges while offering comprehensive administrative tools for educators.

### Key Capabilities

- **Real-time Monitoring**: Live screen capture and activity tracking
- **AI-Powered Grading**: Automated code analysis and scoring
- **Multi-Language Support**: JavaScript, Python, Java, C++ execution environments
- **Anti-Cheat System**: Tab switching detection, screen sharing monitoring
- **Secure Containers**: Isolated execution environments for code
- **Modern UI/UX**: Responsive design with dark/light themes

## ✨ Features

### 🎓 Student Features
- **Interactive Code Editor**: Monaco Editor with syntax highlighting
- **Multi-Language Support**: JavaScript, Python, Java, C++
- **File Upload**: Support for multiple file submissions
- **Real-time Feedback**: Instant code execution and results
- **Timer Integration**: Built-in countdown timers for exams
- **Progress Tracking**: Visual progress indicators

### 👨‍💼 Admin Features
- **Dashboard Analytics**: Comprehensive monitoring dashboard
- **Live Monitoring**: Real-time student activity tracking
- **Screenshot Viewer**: Historical screenshot analysis
- **Event Logs**: Detailed activity logs and reports
- **Question Management**: Create and manage coding challenges
- **Bulk Operations**: Mass screenshot capture and analysis

### 🔒 Security Features
- **Tab Switch Detection**: Monitors browser tab changes
- **Screen Capture**: Automatic screenshot capture
- **Screen Sharing**: WebRTC-based screen sharing
- **Container Isolation**: Secure code execution environments
- **Session Management**: Secure authentication and authorization

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Wouter** - Lightweight routing
- **React Query** - Data fetching and caching
- **Monaco Editor** - Code editor
- **Framer Motion** - Animations

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL** - Primary database
- **MongoDB** - Document storage for logs/screenshots
- **Docker** - Containerization
- **Puppeteer** - Screenshot automation

### DevOps & Tools
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **ESBuild** - JavaScript bundler
- **Prisma** - Database toolkit
- **JWT** - Authentication tokens
- **WebRTC** - Real-time communication

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Databases     │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│   PostgreSQL    │
│                 │    │                 │    │   MongoDB       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Code Editor   │    │   Container     │    │   File Storage  │
│   (Monaco)      │    │   Manager       │    │   (Screenshots) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or 20.x
- PostgreSQL 13+
- MongoDB 4.4+
- Docker (optional)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd college-coding-lab-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/coding_lab"
MONGODB_URI="mongodb://localhost:27017/coding_lab_monitoring"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"

# Server Configuration
PORT=5000
NODE_ENV=development

# AI Grading (Optional)
GROQ_API_KEY="your-groq-api-key"
```

### 4. Database Setup
```bash
# Push database schema
npm run db:push

# Seed initial data (optional)
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📦 Installation

### Manual Installation

1. **Install Node.js Dependencies**
   ```bash
   npm install
   ```

2. **Setup PostgreSQL Database**
   ```sql
   CREATE DATABASE coding_lab;
   CREATE USER coding_lab_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE coding_lab TO coding_lab_user;
   ```

3. **Setup MongoDB**
   ```bash
   # Using MongoDB Compass or CLI
   use coding_lab_monitoring
   ```

4. **Build the Application**
   ```bash
   npm run build
   ```

5. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Installation

1. **Build Docker Image**
   ```bash
   docker build -t college-coding-lab .
   ```

2. **Run with Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       image: college-coding-lab
       ports:
         - "5000:5000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/coding_lab
         - MONGODB_URI=mongodb://mongo:27017/coding_lab_monitoring
       depends_on:
         - db
         - mongo
     
     db:
       image: postgres:13
       environment:
         - POSTGRES_DB=coding_lab
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     mongo:
       image: mongo:4.4
       volumes:
         - mongo_data:/data/db
   
   volumes:
     postgres_data:
     mongo_data:
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `MONGODB_URI` | MongoDB connection string | - | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `PORT` | Server port | 5000 | ❌ |
| `NODE_ENV` | Environment mode | development | ❌ |
| `GROQ_API_KEY` | AI grading API key | - | ❌ |

### Database Configuration

The application uses two databases:

1. **PostgreSQL**: Primary data storage (users, submissions, questions)
2. **MongoDB**: Document storage (screenshots, logs, monitoring data)

### Container Configuration

Code execution environments are configured in the `dockerfiles/` directory:
- `Dockerfile-python` - Python execution
- `Dockerfile-javascript` - Node.js execution
- `Dockerfile-java` - Java execution
- `Dockerfile-cpp` - C++ execution

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run check        # TypeScript type checking
npm run lint         # Run linting (placeholder)
npm run test         # Run tests (placeholder)
npm run ci           # Full CI pipeline

# Database
npm run db:push      # Push schema changes
```

### Project Structure

```
college-coding-lab-system/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── models/            # Data models
│   ├── utils/             # Utility functions
│   └── routes.ts          # API routes
├── shared/                # Shared types and schemas
├── dockerfiles/           # Language-specific Docker files
├── .github/workflows/     # CI/CD pipeline
└── dist/                  # Build output
```

### Development Guidelines

1. **TypeScript**: All code must be properly typed
2. **Components**: Use functional components with hooks
3. **Styling**: Use Tailwind CSS classes
4. **State Management**: Use React Query for server state
5. **Error Handling**: Implement proper error boundaries

## 🐳 Docker Deployment

### Production Dockerfile

The application includes a production-ready Dockerfile with:
- Node.js 18 LTS base image
- Puppeteer dependencies for screenshot capture
- Google Chrome for stable browser automation
- Non-privileged user for security
- Health checks for container monitoring

### Multi-Container Setup

```bash
# Build all containers
docker build -t college-coding-lab .

# Run with external databases
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e MONGODB_URI="mongodb://..." \
  college-coding-lab
```

## 📊 Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);
```

#### Submissions
```sql
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  code TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  has_file BOOLEAN DEFAULT FALSE,
  filename TEXT,
  file_extension TEXT,
  file_size INTEGER
);
```

#### Questions
```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  language TEXT DEFAULT 'JavaScript',
  difficulty TEXT DEFAULT 'medium',
  time_limit INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB Collections

- **screenshots**: Student screenshot captures
- **screen_shares**: Screen sharing events
- **logs**: General monitoring logs

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with secure secret validation
- Role-based access control (Student/Admin)
- Secure password hashing
- Session management with secure cookies
- Environment variable validation

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Attack Detection**: Blocks common attack patterns (XSS, SQL injection, directory traversal)
- **Security Headers**: Comprehensive security headers (HSTS, X-Frame-Options, etc.)
- **Path Blocking**: Blocks access to API documentation and sensitive endpoints
- **Request Logging**: Comprehensive request/response logging with IP tracking

### Anti-Cheat Measures
- **Tab Switch Detection**: Monitors browser focus changes
- **Screen Capture**: Automatic screenshot capture
- **Screen Sharing**: WebRTC-based monitoring
- **Container Isolation**: Secure code execution environments
- **Activity Logging**: Comprehensive event tracking

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure file upload handling with type validation
- Suspicious pattern detection and blocking
- Server information hiding

### Network Security
- HTTPS enforcement in production
- Secure cookie configuration
- CORS protection
- Request size limiting
- IP-based rate limiting

## 🤖 AI Integration

### Autograding System
The application includes an AI-powered grading system using Groq API:

- **Code Analysis**: Automated code quality assessment
- **Scoring**: Intelligent scoring based on multiple criteria
- **Feedback**: Detailed feedback and suggestions
- **Strengths/Weaknesses**: Identifies code strengths and areas for improvement

### AI Features
- Code quality scoring (0-100)
- Readability assessment
- Efficiency analysis
- Automated feedback generation
- Improvement suggestions

## 📱 API Documentation

### Authentication Endpoints

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "role": "student"
}
```

### Submission Endpoints

```http
POST /api/submissions
Content-Type: application/json

{
  "subject": "Data Structures",
  "code": "function solution() { return 'Hello World'; }",
  "hasFile": false
}
```

### Monitoring Endpoints

```http
GET /api/monitoring/screenshots?userId=123
GET /api/monitoring/logs?type=tab-switch
POST /api/monitoring/screenshot
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Test Coverage

The project includes comprehensive testing for:
- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Component testing for React components

## 📈 CI/CD Pipeline

### GitHub Actions Workflow

The project includes a comprehensive CI/CD pipeline (`.github/workflows/ci-cd.yml`) that:

1. **Code Quality Checks**
   - TypeScript compilation
   - Linting (when configured)
   - Security vulnerability scanning

2. **Build Process**
   - Frontend build with Vite
   - Backend build with ESBuild
   - Artifact generation

3. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

4. **Deployment**
   - Docker image building
   - Artifact upload
   - Deployment to staging/production

### Pipeline Stages

```yaml
# Triggered on push/PR to main branch
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Multi-Node.js testing
strategy:
  matrix:
    node-version: [18.x, 20.x]
```

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run ci`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style
- Ensure all CI checks pass

### Code Style

- Use Prettier for code formatting
- Follow ESLint rules
- Use meaningful variable names
- Write self-documenting code
- Add JSDoc comments for complex functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Contributing Guide](docs/contributing.md)

### Getting Help
- Create an issue for bug reports
- Use discussions for questions
- Check existing issues before creating new ones

## 🎥 Video Demo

For a comprehensive walkthrough of the system, please refer to the video:

[![College Coding Lab System Demo](https://img.youtube.com/vi/A60YM-6Puj4/maxresdefault.jpg)](https://youtu.be/A60YM-6Puj4)

*Click the image above to watch the full demo on YouTube*
---

## 👥 Contributors

I would like to thank the following contributors who have made this project possible:

### Core Contributors
- **Rifah Balquees** - Project Development & Implementation
- **Shrinidhi Pawar** - Project Development & Implementation


---

## 🏆 Acknowledgments

- **Monaco Editor** - Code editing capabilities
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Drizzle ORM** - Type-safe database operations
- **Puppeteer** - Browser automation for screenshots
- **WebRTC** - Real-time communication capabilities

---

**Built with ❤️ for our educational institution**
