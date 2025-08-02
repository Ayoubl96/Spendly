from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from sqlalchemy import text
from app.core.database import engine, Base
from app.api.v1 import (
    auth, users, transactions, budgets, analytics, categories, assets, networth
)

# Ensure UUID extension is enabled and create tables if they don't exist
try:
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
        connection.commit()
except Exception as e:
    print(f"Warning: Could not enable UUID extension: {e}")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix=f"{settings.API_V1_STR}/budgets", tags=["budgets"])
app.include_router(assets.router, prefix=f"{settings.API_V1_STR}/assets", tags=["assets"])
app.include_router(networth.router, prefix=f"{settings.API_V1_STR}/networth", tags=["networth"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to Spendly API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}