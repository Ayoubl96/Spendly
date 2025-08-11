"""
Spendly Backend - FastAPI Application Entry Point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.core.config import settings
from app.core.database import init_db
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.expenses import router as expenses_router
from app.api.categories import router as categories_router
from app.api.budgets import router as budgets_router
from app.api.budget_groups import router as budget_groups_router
from app.api.budget_plans import router as budget_plans_router
from app.api.currencies import router as currencies_router
from app.api.analytics import router as analytics_router
from app.api.expense_import import router as expense_import_router
from app.api.payment_methods import router as payment_methods_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print("🚀 Starting Spendly Backend...")
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("🛑 Shutting down Spendly Backend...")


# Create FastAPI application
app = FastAPI(
    title="Spendly API",
    description="Personal Expense Tracking Platform API",
    version="1.0.0",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan
)

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "spendly-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

# API Routes
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(expenses_router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(categories_router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(budgets_router, prefix="/api/v1/budgets", tags=["Budgets"])
app.include_router(budget_groups_router, prefix="/api/v1/budget-groups", tags=["Budget Groups"])
app.include_router(budget_plans_router, prefix="/api/v1/budget-plans", tags=["Budget Plans"])
app.include_router(currencies_router, prefix="/api/v1/currencies", tags=["Currencies"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(expense_import_router, prefix="/api/v1/expense-import", tags=["Expense Import"])
app.include_router(payment_methods_router, prefix="/api/v1/payment-methods", tags=["Payment Methods"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to Spendly API",
        "version": "1.0.0",
        "docs_url": "/docs" if settings.ENABLE_DOCS else "Documentation disabled",
        "health_url": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )