# Spendly - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Spendly platform. Follow these steps in order to ensure a smooth development process.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.11+ installed
- Node.js 18+ and npm installed
- Git installed
- PostgreSQL client tools (optional)
- Redis client tools (optional)

## Phase 1: Project Setup and Foundation

### Step 1: Initialize Project Structure

```bash
# Create main project directories
mkdir -p spendly/{backend,frontend,nginx,docs}
cd spendly

# Initialize git repository
git init
git add .
git commit -m "Initial project structure"
```

### Step 2: Backend Setup

#### 2.1 Create Backend Structure

```bash
cd backend
mkdir -p app/{api/v1,core,models,schemas,services,utils}
mkdir -p tests
mkdir -p alembic
```

#### 2.2 Create Python Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 2.3 Create Requirements File

Create `backend/requirements.txt`:
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
email-validator==2.1.0
pydantic==2.5.0
pydantic-settings==2.1.0
redis==5.0.1
celery==5.3.4
pandas==2.1.3
openpyxl==3.1.2
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
```

#### 2.4 Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Frontend Setup

#### 3.1 Create React Application

```bash
cd ../frontend
npx create-react-app . --template typescript
```

#### 3.2 Install Additional Dependencies

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @reduxjs/toolkit react-redux
npm install axios react-router-dom
npm install recharts
npm install react-hook-form yup @hookform/resolvers
npm install @types/react-redux --save-dev
```

### Step 4: Docker Configuration

#### 4.1 Create Docker Compose File

Create `docker-compose.yml` in project root:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: spendly_user
      POSTGRES_PASSWORD: spendly_pass
      POSTGRES_DB: spendly_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spendly_user -d spendly_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://spendly_user:spendly_pass@postgres:5432/spendly_db
      REDIS_URL: redis://redis:6379
      SECRET_KEY: ${SECRET_KEY:-your-secret-key-here}
      ENVIRONMENT: development
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      REACT_APP_API_URL: http://localhost/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend
    command: npm start

  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
      - frontend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro

volumes:
  postgres_data:
  redis_data:
  backend_uploads:
```

#### 4.2 Create Backend Dockerfile

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4.3 Create Frontend Dockerfile

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### 4.4 Create Nginx Configuration

Create `nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name localhost;

        # API routes
        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support for hot reload (development)
        location /ws {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

Create `nginx/Dockerfile`:
```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Phase 2: Core Backend Implementation

### Step 5: Database Models

#### 5.1 Create Database Configuration

Create `backend/app/core/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### 5.2 Create Configuration

Create `backend/app/core/config.py`:
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Spendly"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    DATABASE_URL: str
    REDIS_URL: str
    
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 5.3 Create User Model

Create `backend/app/models/user.py`:
```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### Step 6: Authentication System

#### 6.1 Create Security Utilities

Create `backend/app/core/security.py`:
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

#### 6.2 Create Authentication Endpoints

Create `backend/app/api/v1/auth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import Token
from datetime import timedelta
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

### Step 7: Main Application

Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, users, transactions, budgets, analytics
from app.core.config import settings
from app.core.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix=f"{settings.API_V1_STR}/budgets", tags=["budgets"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])

@app.get("/")
async def root():
    return {"message": "Welcome to Spendly API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Phase 3: Frontend Implementation

### Step 8: Redux Store Setup

#### 8.1 Create Store Configuration

Create `frontend/src/store/index.ts`:
```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import transactionReducer from './slices/transactionSlice';
import budgetReducer from './slices/budgetSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transactions: transactionReducer,
    budgets: budgetReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 8.2 Create Auth Slice

Create `frontend/src/store/slices/authSlice.ts`:
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await axios.post('/api/v1/auth/login', credentials);
    return response.data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.access_token;
        localStorage.setItem('token', action.payload.access_token);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
```

### Step 9: API Service Layer

Create `frontend/src/services/api.ts`:
```typescript
import axios from 'axios';
import { store } from '../store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch({ type: 'auth/logout' });
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 10: Component Structure

#### 10.1 Create Layout Component

Create `frontend/src/components/Layout/Layout.tsx`:
```typescript
import React from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const menuItems = [
    { text: 'Dashboard', path: '/' },
    { text: 'Transactions', path: '/transactions' },
    { text: 'Budgets', path: '/budgets' },
    { text: 'Analytics', path: '/analytics' },
    { text: 'Net Worth', path: '/net-worth' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Spendly
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            top: '64px',
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem button key={item.text} component={Link} to={item.path}>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
```

## Phase 4: Database Migrations

### Step 11: Alembic Setup

#### 11.1 Initialize Alembic

```bash
cd backend
alembic init alembic
```

#### 11.2 Configure Alembic

Edit `backend/alembic.ini`:
```ini
sqlalchemy.url = postgresql://spendly_user:spendly_pass@localhost:5432/spendly_db
```

#### 11.3 Update Alembic Environment

Edit `backend/alembic/env.py`:
```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from app.core.database import Base
from app.models import *  # Import all models

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata
```

#### 11.4 Create Initial Migration

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Phase 5: Testing

### Step 12: Backend Tests

Create `backend/tests/test_auth.py`:
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpass"}
    )
    assert response.status_code == 401  # Should fail with no user

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
```

### Step 13: Frontend Tests

Create `frontend/src/App.test.tsx`:
```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app', () => {
  render(<App />);
  const element = screen.getByText(/Spendly/i);
  expect(element).toBeInTheDocument();
});
```

## Phase 6: Deployment

### Step 14: Environment Variables

Create `.env` file in project root:
```env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql://spendly_user:spendly_pass@postgres:5432/spendly_db
REDIS_URL=redis://redis:6379
ENVIRONMENT=development
```

### Step 15: Run the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Next Steps

1. Implement remaining API endpoints
2. Complete frontend components
3. Add data validation
4. Implement file upload for CSV/Excel
5. Add comprehensive error handling
6. Implement caching strategy
7. Add monitoring and logging
8. Write comprehensive tests
9. Set up CI/CD pipeline
10. Prepare for production deployment

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Verify network connectivity

2. **Frontend Not Loading**
   - Check if backend is running
   - Verify API_URL configuration
   - Check browser console for errors

3. **Docker Issues**
   - Run `docker-compose logs` to check errors
   - Ensure all ports are available
   - Check Docker daemon is running

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)