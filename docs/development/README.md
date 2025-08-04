# Development Guide

This guide covers the development setup, coding standards, and workflow for the Spendly expense tracking platform.

## 📋 Table of Contents

1. [Development Environment](#development-environment)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Development Workflow](#development-workflow)
5. [Testing Strategy](#testing-strategy)
6. [Debugging Guide](#debugging-guide)

## 🛠️ Development Environment

### Prerequisites

```bash
# System Requirements
- Docker Engine 20.0+
- Docker Compose 2.0+
- Python 3.11+ (optional, for local development)
- Git 2.30+
- VS Code (recommended)
```

### Environment Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd spendly

# 2. Copy environment configuration
cp .env.example .env

# 3. Configure environment variables
vim .env  # Edit as needed

# 4. Start development environment
docker-compose up -d

# 5. Install dependencies (if developing locally)
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

### Development Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Frontend | 3000 | http://localhost:3000 | React development server |
| Backend API | 3001 | http://localhost:3001 | Python FastAPI server |
| Database | 5432 | localhost:5432 | PostgreSQL database |
| Redis | 6379 | localhost:6379 | Redis cache |
| Mailhog | 8025 | http://localhost:8025 | Email testing |

## 🏗️ Project Structure

### Backend Structure

```
backend/
├── app/
│   ├── api/                 # API routes and endpoints
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── expenses.py
│   │   ├── budgets.py
│   │   └── users.py
│   ├── core/               # Core configuration and security
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── security.py
│   │   └── dependencies.py
│   ├── crud/               # Database CRUD operations
│   │   ├── __init__.py
│   │   ├── crud_user.py
│   │   ├── crud_expense.py
│   │   ├── crud_category.py
│   │   └── crud_budget.py
│   ├── db/                 # Database models and connection
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── expense.py
│   │   │   ├── category.py
│   │   │   └── budget.py
│   │   └── migrations/
│   ├── schemas/            # Pydantic data models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── expense.py
│   │   ├── category.py
│   │   └── budget.py
│   ├── services/           # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── expense_service.py
│   │   ├── currency_service.py
│   │   └── budget_service.py
│   └── utils/              # Utility functions
│       ├── __init__.py
│       ├── currency.py
│       ├── validation.py
│       └── date_utils.py
├── tests/                  # Test files
│   ├── __init__.py
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── alembic/               # Database migrations
│   ├── versions/
│   └── alembic.ini
├── main.py               # FastAPI app entry point
├── requirements.txt      # Python dependencies
└── pyproject.toml       # Project configuration
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   └── Table/
│   │   ├── expense/        # Expense-specific components
│   │   │   ├── ExpenseForm/
│   │   │   ├── ExpenseList/
│   │   │   └── ExpenseCard/
│   │   └── budget/         # Budget components
│   │       ├── BudgetCard/
│   │       └── BudgetChart/
│   ├── pages/              # Page components
│   │   ├── Dashboard/
│   │   ├── Expenses/
│   │   ├── Budget/
│   │   └── Settings/
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useExpenses.ts
│   │   └── useBudget.ts
│   ├── services/           # API client services
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   └── expense.service.ts
│   ├── store/              # State management (Zustand)
│   │   ├── auth.store.ts
│   │   ├── expense.store.ts
│   │   └── ui.store.ts
│   ├── utils/              # Utility functions
│   │   ├── currency.util.ts
│   │   ├── date.util.ts
│   │   └── format.util.ts
│   ├── types/              # TypeScript types
│   │   ├── expense.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── styles/             # CSS/SCSS files
│   │   ├── globals.css
│   │   ├── components/
│   │   └── themes/
│   └── App.tsx
├── public/
├── tests/
└── package.json
```

## 📝 Coding Standards

### Python Standards

```python
from typing import List, Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel
from enum import Enum

# Use type hints for functions
def calculate_total(expenses: List[Expense]) -> Decimal:
    return sum(expense.amount for expense in expenses)

# Use Pydantic models for data validation
class ExpenseCreate(BaseModel):
    amount: Decimal
    currency: str
    category: str
    description: str
    expense_date: date

# Use enums for constants
class ExpenseCategory(str, Enum):
    HOUSING = "housing"
    TRANSPORT = "transport"
    FOOD = "food"
    ENTERTAINMENT = "entertainment"
```

### React Standards

```tsx
// Use functional components with TypeScript
interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onEdit,
  onDelete
}) => {
  return (
    <div className="expense-card">
      {/* Component content */}
    </div>
  );
};

// Use custom hooks for logic
export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Hook logic
  
  return { expenses, loading, addExpense, updateExpense };
};
```

### API Standards

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import ExpenseService
from app.core.dependencies import get_db, get_current_user

router = APIRouter()

# Route definition
@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        expense_data = ExpenseService.create(db, expense, current_user.id)
        return {"data": expense_data, "message": "Expense created"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Service structure
class ExpenseService:
    @staticmethod
    def create(db: Session, expense_data: ExpenseCreate, user_id: str) -> Expense:
        # Validate data
        # Apply business logic
        # Save to database
        # Return result
        pass
```

### Database Standards

```python
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from uuid import uuid4

Base = declarative_base()

# Model definition
class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    description = Column(String(500), nullable=False)
    expense_date = Column(Date, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
```

## 🔄 Development Workflow

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/expense-categories

# 2. Make changes and commit
git add .
git commit -m "feat: add expense category management"

# 3. Push and create PR
git push origin feature/expense-categories
```

### Commit Message Format

```
type(scope): description

feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: adding tests
chore: maintenance
```

### Code Review Process

1. **Self Review**: Test locally, check linting
2. **Peer Review**: Another developer reviews code
3. **Testing**: Automated tests must pass
4. **Deployment**: Merge to main branch

## 🧪 Testing Strategy

### Backend Testing

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.expense_service import ExpenseService

client = TestClient(app)

# Unit test example
def test_expense_service_create():
    expense_data = {
        "amount": 100,
        "currency": "EUR",
        "category": "food",
        "description": "Lunch"
    }
    
    expense = ExpenseService.create(db, expense_data, user_id)
    
    assert expense.amount == 100
    assert expense.currency == "EUR"

# Integration test example
def test_create_expense_endpoint():
    expense_data = {
        "amount": 100,
        "currency": "EUR",
        "category": "food",
        "description": "Lunch",
        "expense_date": "2024-12-04"
    }
    
    response = client.post(
        "/api/v1/expenses/",
        json=expense_data,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 201
    assert response.json()["data"]["amount"] == 100
```

### Frontend Testing

```tsx
// Component test
import { render, screen } from '@testing-library/react';
import { ExpenseCard } from './ExpenseCard';

test('renders expense information', () => {
  const expense = {
    id: '1',
    amount: 100,
    currency: 'EUR',
    description: 'Test expense'
  };
  
  render(<ExpenseCard expense={expense} onEdit={() => {}} onDelete={() => {}} />);
  
  expect(screen.getByText('€100')).toBeInTheDocument();
  expect(screen.getByText('Test expense')).toBeInTheDocument();
});

// Hook test
import { renderHook, act } from '@testing-library/react';
import { useExpenses } from './useExpenses';

test('should add expense', async () => {
  const { result } = renderHook(() => useExpenses());
  
  await act(async () => {
    await result.current.addExpense(expenseData);
  });
  
  expect(result.current.expenses).toHaveLength(1);
});
```

### Test Commands

```bash
# Backend tests
cd backend
pytest                     # Run all tests
pytest -v                 # Verbose mode
pytest --cov              # Coverage report
pytest --cov-report=html  # HTML coverage report

# Frontend tests
cd frontend
npm test                   # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# E2E tests
pytest tests/e2e/         # End-to-end tests
```

## 🐛 Debugging Guide

### Backend Debugging

```bash
# Enable debug logs
LOG_LEVEL=DEBUG python main.py

# Database queries (SQLAlchemy)
echo 'logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)' >> main.py

# FastAPI requests
uvicorn main:app --reload --log-level debug

# Python debugger
python -m pdb main.py
```

### Frontend Debugging

```bash
# React Developer Tools
# Install browser extension

# Debug API calls
console.log('API call:', data);

# Network tab inspection
# Monitor API responses
```

### Docker Debugging

```bash
# View container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# Access container shell
docker-compose exec backend bash
docker-compose exec database psql -U postgres

# Check container status
docker-compose ps
```

## 🔧 Common Issues

### Database Connection Issues

```bash
# Check database status
docker-compose ps database

# Reset database
docker-compose down -v
docker-compose up -d database

# Run migrations
alembic upgrade head
```

### Port Conflicts

```bash
# Check port usage
lsof -i :3000
lsof -i :3001

# Stop conflicting processes
kill -9 <PID>

# Use different ports
PORT=3002 npm start
```

### Cache Issues

```bash
# Clear npm cache
npm cache clean --force

# Clear Docker cache
docker system prune -a

# Clear browser cache
# Use browser dev tools
```

---

**Next Steps**:
1. Set up development environment
2. Review coding standards
3. Start with backend API development
4. Follow testing practices
5. Use debugging tools as needed