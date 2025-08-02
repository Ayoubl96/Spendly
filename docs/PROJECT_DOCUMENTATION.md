# Spendly - Personal Finance Management Platform

## Table of Contents
1. [Project Overview](#project-overview)
2. [Current System Analysis](#current-system-analysis)
3. [Platform Requirements](#platform-requirements)
4. [Feature Specifications](#feature-specifications)
5. [Technical Architecture](#technical-architecture)
6. [Implementation Phases](#implementation-phases)
7. [Data Models](#data-models)
8. [API Specifications](#api-specifications)
9. [Security Considerations](#security-considerations)
10. [Deployment Strategy](#deployment-strategy)

## 1. Project Overview

### Purpose
Spendly is a comprehensive personal finance management platform designed to track expenses, manage budgets, monitor net worth, and provide analytical insights into financial health.

### Goals
- Replace manual Excel-based tracking with an automated, scalable web platform
- Provide real-time financial insights and analytics
- Enable easy expense tracking and budget management
- Monitor investment portfolio and net worth over time
- Offer a secure, containerized solution with modern UI/UX

### Target User
Individual users managing personal finances who need a comprehensive tool for expense tracking, budget management, and wealth monitoring.

## 2. Current System Analysis

Based on the analysis of existing Excel files:

### 2024 - Ayoub Expenses - Personal.xlsx
- **Structure**: 16 worksheets
  - Graphs: Visual representations of expenses
  - Expenses Short: Summary view
  - Expenses: Detailed expense tracking
  - Template: Expense entry template
  - Monthly sheets (Jan-Dec): Monthly expense records
- **Purpose**: Track monthly expenses by category

### Ayoub Lefhim Net Worth.xlsx
- **Structure**: 11 worksheets
  - Yearly sheets (2022, 2023, 2024, 2025): Annual financial summaries
  - Income: Income tracking
  - Expenses: Expense summaries
  - Historical NW: Net worth over time
  - Net Worth By Asset Class: Asset allocation
  - Income And Expenses: Combined view
  - Asset Allocation: Investment distribution
- **Purpose**: Track overall financial health, investments, and net worth

## 3. Platform Requirements

### Must-Have Requirements
1. **Containerized Platform**: Docker-based deployment for portability
2. **Scalability**: Flexible category management and data structure
3. **Import Functionality**: CSV/Excel file import capability
4. **Authentication**: Secure login system with credentials
5. **Responsive UI/UX**: Mobile-friendly, intuitive interface
6. **Python Backend**: FastAPI or Django for API development
7. **Modern Frontend**: React/Vue.js for dynamic UI

### Additional Requirements
- Real-time data synchronization
- Multi-currency support
- Data export functionality
- Automated backup system
- RESTful API architecture

## 4. Feature Specifications

### 4.1 Budget Management
- Create monthly/yearly budgets
- Set spending limits by category
- Budget vs. actual comparison
- Alerts for budget overruns
- Flexible budget periods

### 4.2 Expense Tracking
- Quick expense entry
- Category management (add/edit/delete)
- Recurring expense support
- Receipt attachment
- Expense search and filtering
- Bulk import from CSV/Excel

### 4.3 Net Worth Tracking
- Asset management (investments, cash, property)
- Liability tracking
- Real-time portfolio valuation
- Historical net worth charts
- Asset allocation visualization

### 4.4 Analytics Dashboard
- Monthly/yearly expense trends
- Category-wise spending analysis
- Income vs. expense comparison
- Net worth growth tracking
- Custom report generation
- Interactive charts and graphs

### 4.5 User Management
- Secure authentication (JWT tokens)
- Profile management
- Password reset functionality
- Session management
- Activity logging

## 5. Technical Architecture

### 5.1 Technology Stack

#### Backend
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT with python-jose
- **File Processing**: pandas, openpyxl
- **Task Queue**: Celery with Redis
- **API Documentation**: OpenAPI/Swagger

#### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Charts**: Chart.js or Recharts
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Routing**: React Router

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **File Storage**: Local volume (upgradeable to S3)

### 5.2 System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Nginx Proxy    │────▶│  FastAPI Backend│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                              ┌───────────────────────────┴───────┐
                              │                                   │
                        ┌─────▼─────┐                    ┌───────▼────┐
                        │           │                    │            │
                        │PostgreSQL │                    │   Redis    │
                        │           │                    │            │
                        └───────────┘                    └────────────┘
```

### 5.3 Container Architecture

```yaml
services:
  frontend:
    - React application
    - Nginx for serving static files
    - Port: 3000

  backend:
    - FastAPI application
    - Uvicorn ASGI server
    - Port: 8000

  nginx:
    - Reverse proxy
    - SSL termination
    - Port: 80/443

  postgres:
    - PostgreSQL database
    - Persistent volume
    - Port: 5432

  redis:
    - Cache and session store
    - Task queue backend
    - Port: 6379
```

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Project setup and structure
2. Docker environment configuration
3. Database schema design
4. Basic authentication system
5. Core API endpoints

### Phase 2: Core Features (Week 3-4)
1. Expense tracking module
2. Category management
3. Budget creation and management
4. Basic dashboard
5. CSV/Excel import functionality

### Phase 3: Advanced Features (Week 5-6)
1. Net worth tracking
2. Investment portfolio management
3. Analytics and reporting
4. Advanced visualizations
5. Export functionality

### Phase 4: Polish & Optimization (Week 7-8)
1. UI/UX improvements
2. Performance optimization
3. Security hardening
4. Documentation
5. Testing and bug fixes

## 7. Data Models

### 7.1 User Model
```python
User:
  - id: UUID
  - email: String (unique)
  - password_hash: String
  - full_name: String
  - created_at: DateTime
  - updated_at: DateTime
  - is_active: Boolean
```

### 7.2 Category Model
```python
Category:
  - id: UUID
  - user_id: UUID (FK)
  - name: String
  - type: Enum (income/expense)
  - color: String
  - icon: String
  - parent_id: UUID (nullable, FK)
  - created_at: DateTime
```

### 7.3 Transaction Model
```python
Transaction:
  - id: UUID
  - user_id: UUID (FK)
  - category_id: UUID (FK)
  - amount: Decimal
  - currency: String
  - date: Date
  - description: String
  - type: Enum (income/expense)
  - recurring: Boolean
  - created_at: DateTime
```

### 7.4 Budget Model
```python
Budget:
  - id: UUID
  - user_id: UUID (FK)
  - category_id: UUID (FK, nullable)
  - amount: Decimal
  - period: Enum (monthly/yearly)
  - start_date: Date
  - end_date: Date
  - created_at: DateTime
```

### 7.5 Asset Model
```python
Asset:
  - id: UUID
  - user_id: UUID (FK)
  - name: String
  - type: Enum (cash/investment/property/other)
  - value: Decimal
  - currency: String
  - updated_at: DateTime
```

### 7.6 NetWorthSnapshot Model
```python
NetWorthSnapshot:
  - id: UUID
  - user_id: UUID (FK)
  - date: Date
  - total_assets: Decimal
  - total_liabilities: Decimal
  - net_worth: Decimal
  - asset_breakdown: JSON
```

## 8. API Specifications

### 8.1 Authentication Endpoints
```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login
POST   /api/auth/refresh      - Refresh JWT token
POST   /api/auth/logout       - User logout
```

### 8.2 User Management
```
GET    /api/users/profile     - Get user profile
PUT    /api/users/profile     - Update user profile
PUT    /api/users/password    - Change password
```

### 8.3 Category Management
```
GET    /api/categories        - List all categories
POST   /api/categories        - Create category
PUT    /api/categories/{id}   - Update category
DELETE /api/categories/{id}   - Delete category
```

### 8.4 Transaction Management
```
GET    /api/transactions      - List transactions (paginated)
POST   /api/transactions      - Create transaction
PUT    /api/transactions/{id} - Update transaction
DELETE /api/transactions/{id} - Delete transaction
POST   /api/transactions/import - Import from CSV/Excel
```

### 8.5 Budget Management
```
GET    /api/budgets           - List budgets
POST   /api/budgets           - Create budget
PUT    /api/budgets/{id}      - Update budget
DELETE /api/budgets/{id}      - Delete budget
GET    /api/budgets/status    - Get budget status
```

### 8.6 Analytics
```
GET    /api/analytics/summary        - Financial summary
GET    /api/analytics/expenses       - Expense analytics
GET    /api/analytics/income         - Income analytics
GET    /api/analytics/networth       - Net worth trends
GET    /api/analytics/categories     - Category breakdown
```

## 9. Security Considerations

### 9.1 Authentication & Authorization
- JWT-based authentication
- Token expiration and refresh mechanism
- Role-based access control (future enhancement)
- Secure password hashing (bcrypt)

### 9.2 Data Protection
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention (ORM)
- XSS protection
- CSRF protection

### 9.3 Infrastructure Security
- Container security best practices
- Environment variable management
- Database encryption at rest
- Regular security updates
- Audit logging

## 10. Deployment Strategy

### 10.1 Development Environment
```bash
docker-compose up -d
```

### 10.2 Production Deployment
- Use Docker Swarm or Kubernetes
- Implement CI/CD pipeline
- Automated backups
- Monitoring and alerting
- Load balancing

### 10.3 Backup Strategy
- Daily database backups
- Automated backup to cloud storage
- Point-in-time recovery capability
- Regular backup testing

### 10.4 Monitoring
- Application performance monitoring
- Error tracking (Sentry)
- Uptime monitoring
- Resource usage tracking
- User activity analytics

## Next Steps

1. Review and approve this documentation
2. Set up the development environment
3. Create the project structure
4. Implement Phase 1 features
5. Iterate based on feedback

This documentation will be updated as the project evolves and new requirements emerge.