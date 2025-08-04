# Spendly - Personal Expense Tracking Platform

A modern web application to replace Excel-based expense tracking with advanced features for personal financial management.

## 🎯 Project Overview

Spendly is designed to replicate and enhance the functionality of your current Excel expense tracking system with a modern, containerized web application. The platform focuses on expense tracking, budgeting, and financial insights with plans for future net worth and income management.

## ✨ Core Features (Phase 1)

### Expense Management
- ✅ Multi-currency expense tracking (EUR, USD, MAD)
- ✅ Real-time currency conversion
- ✅ Primary and secondary expense categorization
- ✅ Monthly expense organization
- ✅ Shared expense tracking and splitting
- ✅ Receipt attachment and notes

### Budget Management
- ✅ Monthly budget setting by category
- ✅ Budget vs. actual spending comparison
- ✅ Budget alerts and notifications
- ✅ Yearly budget planning

### Analytics & Reporting
- ✅ Monthly and yearly expense summaries
- ✅ Category-wise spending analysis
- ✅ Expense trends and patterns
- ✅ Interactive charts and visualizations
- ✅ Export capabilities (CSV, PDF)

## 🚀 Future Features (Roadmap)

### Phase 2: Income & Net Worth
- 💰 Income tracking and categorization
- 📈 Net worth calculation and tracking
- 🏦 Asset and liability management
- 📊 Financial health scoring

### Phase 3: Advanced Features
- 🤖 AI-powered expense categorization
- 📱 Mobile app companion
- 🔔 Smart notifications and insights
- 🎯 Financial goal setting and tracking

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: React.js with TypeScript
- **Backend**: Python with FastAPI
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **File Storage**: Local filesystem (future: S3-compatible)
- **Containerization**: Docker & Docker Compose
- **API Documentation**: Swagger/OpenAPI

### Architecture Pattern
- RESTful API backend
- SPA (Single Page Application) frontend
- Microservices-ready architecture
- Container-first deployment

## 📁 Project Structure

```
spendly/
├── docs/                          # Documentation
│   ├── api/                       # API documentation
│   ├── database/                  # Database design
│   ├── deployment/                # Deployment guides
│   └── development/               # Development guides
├── backend/                       # Python backend
│   ├── app/
│   │   ├── api/                  # API routes and endpoints
│   │   ├── core/                 # Core configuration and security
│   │   ├── crud/                 # Database CRUD operations
│   │   ├── db/                   # Database models and connection
│   │   ├── schemas/              # Pydantic data models
│   │   ├── services/             # Business logic
│   │   └── utils/                # Utility functions
│   ├── tests/                    # Backend tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API client
│   │   ├── utils/                # Utility functions
│   │   ├── types/                # TypeScript types
│   │   └── styles/               # CSS/SCSS files
│   ├── public/
│   ├── tests/                    # Frontend tests
│   ├── Dockerfile
│   └── package.json
├── database/                      # Database setup
│   ├── migrations/               # Database migrations
│   ├── seeds/                    # Initial data
│   └── init.sql                  # Database initialization
├── docker-compose.yml            # Local development setup
├── docker-compose.prod.yml       # Production setup
├── .env.example                  # Environment variables template
└── README.md
```

## 🐳 Containerization

The application is fully containerized for easy deployment:

- **Development**: `docker-compose.yml` for local development with hot reload
- **Production**: `docker-compose.prod.yml` for production deployment
- **Services**: Backend API, Frontend, PostgreSQL, Redis (caching)

## 📊 Data Migration Strategy

### From Excel to Database
1. **Import Tool**: Built-in Excel import functionality
2. **Data Mapping**: Automatic mapping of Excel categories to database
3. **Validation**: Data validation and cleanup during import
4. **Backup**: Export capabilities to maintain Excel compatibility

### Migration Steps
1. Export current Excel data
2. Run migration script
3. Validate imported data
4. Set up categories and budgets
5. Begin using web application

## 🔧 Development Setup

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)
- Git

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd spendly

# Copy environment variables
cp .env.example .env

# Start development environment
docker-compose up -d

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Database: localhost:5432
```

## 🎨 Design Principles

### User Experience
- **Mobile-first**: Responsive design for all devices
- **Intuitive**: Simple and clean interface
- **Fast**: Quick expense entry and navigation
- **Accessible**: WCAG 2.1 AA compliance

### Technical
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive test coverage
- **Security**: JWT authentication, input validation
- **Performance**: Optimized queries and caching
- **Scalability**: Microservices-ready architecture

## 📈 Current Excel Feature Mapping

| Excel Feature | Web App Implementation |
|--------------|----------------------|
| Monthly sheets | Monthly view with filtering |
| Currency conversion | Real-time API integration |
| Category tracking | Hierarchical category system |
| Shared expenses | Expense splitting functionality |
| Budget tracking | Budget vs. actual dashboard |
| Summary views | Interactive analytics dashboard |
| Export capabilities | CSV/PDF export options |

## 🔐 Security Considerations

- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Environment-based secrets
- Regular security updates

## 🚀 Deployment Options

### Local Server (Recommended Start)
- Docker Compose setup
- Single server deployment
- SQLite or PostgreSQL
- File-based storage

### Future Cloud Options
- Docker Swarm
- Kubernetes
- Cloud databases
- Object storage (S3-compatible)

## 📚 Documentation Index

- [Development Guide](docs/development/README.md)
- [API Documentation](docs/api/README.md)
- [Database Design](docs/database/README.md)
- [Deployment Guide](docs/deployment/README.md)
- [User Manual](docs/user/README.md)

## 🤝 Contributing

1. Read the development guide
2. Set up local environment
3. Follow coding standards
4. Add tests for new features
5. Update documentation

## 📄 License

MIT License - See LICENSE file for details

---

**Current Status**: 📋 Documentation and Planning Phase
**Next Phase**: 🏗️ Backend API Development
**Target Launch**: 4-6 weeks