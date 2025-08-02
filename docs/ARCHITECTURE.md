# Spendly - Technical Architecture

## Overview

Spendly is built as a microservices-based application using Docker containers. The architecture follows a clean separation of concerns with distinct layers for presentation, business logic, and data persistence.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Web Browser    │    Mobile Browser    │    Future: Mobile Apps         │
└────────┬────────┴──────────┬───────────┴────────────┬──────────────────┘
         │                   │                         │
         └───────────────────┴─────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Presentation Layer                              │
├─────────────────────────────────────────────────────────────────────────┤
│                     React SPA (TypeScript)                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐        │
│  │  Components  │  Redux Store │   Services    │   Utilities  │        │
│  └──────────────┴──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Gateway Layer                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                         Nginx Reverse Proxy                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐        │
│  │ Load Balance │ SSL/TLS Term │ Static Files  │ Rate Limiting│        │
│  └──────────────┴──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application Layer                               │
├─────────────────────────────────────────────────────────────────────────┤
│                        FastAPI Backend (Python)                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐        │
│  │   API Routes │  Middleware  │   Services    │   Models     │        │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤        │
│  │ Auth         │ CORS         │ UserService   │ User         │        │
│  │ Transactions │ Auth         │ TransService  │ Transaction  │        │
│  │ Budgets      │ Logging      │ BudgetService │ Budget       │        │
│  │ Analytics    │ Error Handle │ AssetService  │ Asset        │        │
│  └──────────────┴──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   PostgreSQL    │  │      Redis      │  │   File Storage  │        │
│  │                 │  │                 │  │                 │        │
│  │ - User Data     │  │ - Session Cache │  │ - Uploads       │        │
│  │ - Transactions  │  │ - API Cache     │  │ - Exports       │        │
│  │ - Budgets       │  │ - Task Queue    │  │ - Backups       │        │
│  │ - Assets        │  │                 │  │                 │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── transactions/   # Transaction management
│   │   ├── budgets/        # Budget management
│   │   └── analytics/      # Analytics components
│   ├── pages/              # Page components
│   ├── services/           # API communication
│   ├── store/              # Redux store
│   │   ├── slices/         # Redux slices
│   │   └── middleware/     # Custom middleware
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── styles/             # Global styles
├── public/                 # Static assets
└── package.json           # Dependencies
```

### Backend Architecture

```
backend/
├── app/
│   ├── api/                # API endpoints
│   │   ├── v1/            # API version 1
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── transactions.py
│   │   │   ├── budgets.py
│   │   │   ├── assets.py
│   │   │   └── analytics.py
│   ├── core/              # Core functionality
│   │   ├── config.py      # Configuration
│   │   ├── security.py    # Security utilities
│   │   └── database.py    # Database connection
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── main.py           # Application entry
├── alembic/              # Database migrations
├── tests/                # Test suite
└── requirements.txt      # Dependencies
```

## Technology Stack Details

### Backend Technologies

1. **FastAPI**
   - Modern, fast web framework
   - Automatic API documentation
   - Type hints and validation
   - Async support

2. **SQLAlchemy**
   - ORM for database operations
   - Migration support with Alembic
   - Connection pooling
   - Query optimization

3. **PostgreSQL**
   - ACID compliance
   - JSON support for flexible data
   - Full-text search capabilities
   - Robust indexing

4. **Redis**
   - Session management
   - API response caching
   - Task queue backend
   - Real-time notifications

### Frontend Technologies

1. **React 18**
   - Component-based architecture
   - Virtual DOM for performance
   - Hooks for state management
   - Concurrent features

2. **TypeScript**
   - Type safety
   - Better IDE support
   - Reduced runtime errors
   - Enhanced refactoring

3. **Material-UI (MUI)**
   - Consistent design system
   - Responsive components
   - Theming support
   - Accessibility features

4. **Redux Toolkit**
   - Predictable state management
   - DevTools integration
   - Middleware support
   - Optimized performance

## Data Flow

### Request Flow

```
1. User Action (Frontend)
   ↓
2. Redux Action Dispatch
   ↓
3. API Service Call
   ↓
4. Nginx Proxy
   ↓
5. FastAPI Route Handler
   ↓
6. Authentication Middleware
   ↓
7. Business Logic Service
   ↓
8. Database Query
   ↓
9. Response Transformation
   ↓
10. Client Response
```

### Authentication Flow

```
1. User Login Request
   ↓
2. Validate Credentials
   ↓
3. Generate JWT Token
   ↓
4. Store Refresh Token (Redis)
   ↓
5. Return Access Token
   ↓
6. Include Token in Headers
   ↓
7. Validate Token (Middleware)
   ↓
8. Process Authenticated Request
```

## Security Architecture

### Security Layers

1. **Network Security**
   - HTTPS enforcement
   - CORS configuration
   - Rate limiting
   - IP whitelisting (optional)

2. **Application Security**
   - JWT authentication
   - Input validation
   - SQL injection prevention
   - XSS protection

3. **Data Security**
   - Encryption at rest
   - Encryption in transit
   - Secure password hashing
   - Sensitive data masking

### Security Implementation

```python
# Example: Security Middleware
class SecurityMiddleware:
    - CSRF Protection
    - XSS Prevention
    - SQL Injection Prevention
    - Rate Limiting
    - Request Validation
```

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Backend 1  │     │  Backend 2  │     │  Backend 3  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                          │
                    Load Balancer
```

### Caching Strategy

1. **API Response Caching**
   - Cache frequently accessed data
   - TTL-based invalidation
   - User-specific cache keys

2. **Database Query Caching**
   - Query result caching
   - Prepared statement caching
   - Connection pooling

3. **Static Asset Caching**
   - CDN integration
   - Browser caching headers
   - Compression

## Deployment Architecture

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost/api
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/spendly
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=spendly
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Monitoring and Logging

### Monitoring Stack

1. **Application Monitoring**
   - Request/response times
   - Error rates
   - API usage statistics
   - Resource utilization

2. **Infrastructure Monitoring**
   - Container health
   - Database performance
   - Cache hit rates
   - Disk usage

3. **Logging Strategy**
   - Centralized logging
   - Log aggregation
   - Error tracking
   - Audit trails

### Monitoring Implementation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Application │────▶│   Metrics   │────▶│  Grafana    │
│   Metrics   │     │  Collector  │     │ Dashboard   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Performance Optimization

### Backend Optimization

1. **Database Optimization**
   - Proper indexing
   - Query optimization
   - Connection pooling
   - Batch operations

2. **API Optimization**
   - Pagination
   - Field filtering
   - Response compression
   - Async operations

### Frontend Optimization

1. **Bundle Optimization**
   - Code splitting
   - Lazy loading
   - Tree shaking
   - Minification

2. **Runtime Optimization**
   - Virtual scrolling
   - Memoization
   - Debouncing
   - Request batching

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery
   - Geo-redundant storage
   - Backup testing

2. **Application Backups**
   - Code repository backups
   - Configuration backups
   - Container image registry
   - Documentation backups

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: < 4 hours
2. **RPO (Recovery Point Objective)**: < 24 hours
3. **Automated failover procedures**
4. **Regular disaster recovery drills**

## Future Enhancements

### Planned Features

1. **Mobile Applications**
   - React Native apps
   - Offline support
   - Push notifications

2. **Advanced Analytics**
   - Machine learning insights
   - Predictive budgeting
   - Anomaly detection

3. **Integration Capabilities**
   - Bank API integration
   - Third-party app connections
   - Export to accounting software

4. **Multi-tenancy**
   - Family accounts
   - Shared budgets
   - Role-based permissions