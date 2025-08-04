# API Documentation

This document outlines the RESTful API design for the Spendly expense tracking platform.

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## 🌐 API Overview

### Base Configuration
- **Base URL**: `http://localhost:3001/api/v1`
- **Protocol**: HTTPS (production)
- **Format**: JSON
- **Authentication**: JWT Bearer tokens
- **Versioning**: URL path versioning (`/api/v1/`)

### API Principles
- **RESTful**: Standard HTTP methods and status codes
- **Stateless**: No server-side session storage
- **Consistent**: Uniform response structure
- **Paginated**: Large datasets use cursor-based pagination
- **Filtered**: Support for filtering, sorting, and searching

## 🔐 Authentication

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "iat": 1234567890,
    "exp": 1234567890
  }
}
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "defaultCurrency": "EUR"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "defaultCurrency": "EUR"
    },
    "token": "jwt_token_here"
  },
  "message": "User registered successfully"
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here"
  },
  "message": "Login successful"
}
```

#### POST /auth/refresh
Refresh JWT token.

**Headers:**
```
Authorization: Bearer <current_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_here"
  }
}
```

#### POST /auth/logout
Logout user (invalidate token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## 💰 Expense Management

### GET /expenses
Retrieve user's expenses with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `startDate` (date): Filter from date (YYYY-MM-DD)
- `endDate` (date): Filter to date (YYYY-MM-DD)
- `categoryId` (uuid): Filter by category
- `currency` (string): Filter by currency
- `minAmount` (number): Minimum amount filter
- `maxAmount` (number): Maximum amount filter
- `search` (string): Search in description
- `sortBy` (string): Sort field (date, amount, description)
- `sortOrder` (string): Sort direction (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "amount": 25.50,
        "currency": "EUR",
        "amountInBaseCurrency": 25.50,
        "description": "Lunch at restaurant",
        "expenseDate": "2024-12-04",
        "category": {
          "id": "uuid",
          "name": "Food",
          "color": "#FF6B35"
        },
        "subcategory": {
          "id": "uuid",
          "name": "Restaurants",
          "color": "#FF6B35"
        },
        "paymentMethod": "card",
        "vendor": "Restaurant ABC",
        "location": "Zurich, Switzerland",
        "isShared": false,
        "tags": ["business", "lunch"],
        "attachments": [
          {
            "id": "uuid",
            "filename": "receipt.jpg",
            "url": "/uploads/receipts/receipt.jpg"
          }
        ],
        "createdAt": "2024-12-04T12:30:00Z",
        "updatedAt": "2024-12-04T12:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalAmount": 1250.75,
      "currency": "EUR",
      "count": 150
    }
  }
}
```

### POST /expenses
Create a new expense.

**Request:**
```json
{
  "amount": 25.50,
  "currency": "EUR",
  "description": "Lunch at restaurant",
  "expenseDate": "2024-12-04",
  "categoryId": "uuid",
  "subcategoryId": "uuid",
  "paymentMethod": "card",
  "vendor": "Restaurant ABC",
  "location": "Zurich, Switzerland",
  "notes": "Business lunch with client",
  "tags": ["business", "lunch"],
  "isShared": false,
  "sharedWith": []
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "uuid",
      "amount": 25.50,
      "currency": "EUR",
      "amountInBaseCurrency": 25.50,
      "exchangeRate": 1.0,
      "description": "Lunch at restaurant",
      "expenseDate": "2024-12-04",
      "category": {
        "id": "uuid",
        "name": "Food",
        "color": "#FF6B35"
      },
      "createdAt": "2024-12-04T12:30:00Z"
    }
  },
  "message": "Expense created successfully"
}
```

### GET /expenses/:id
Get a specific expense by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "uuid",
      "amount": 25.50,
      "currency": "EUR",
      "description": "Lunch at restaurant",
      "expenseDate": "2024-12-04",
      "category": {
        "id": "uuid",
        "name": "Food",
        "color": "#FF6B35"
      },
      "sharedExpenses": [
        {
          "id": "uuid",
          "sharedWithUser": {
            "id": "uuid",
            "firstName": "Jane",
            "lastName": "Doe"
          },
          "amountOwed": 12.75,
          "isSettled": false
        }
      ]
    }
  }
}
```

### PUT /expenses/:id
Update an existing expense.

**Request:**
```json
{
  "amount": 30.00,
  "description": "Updated lunch description",
  "categoryId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "uuid",
      "amount": 30.00,
      "description": "Updated lunch description",
      "updatedAt": "2024-12-04T13:00:00Z"
    }
  },
  "message": "Expense updated successfully"
}
```

### DELETE /expenses/:id
Delete an expense.

**Response (200):**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

## 📊 Category Management

### GET /categories
Get user's expense categories.

**Query Parameters:**
- `includeInactive` (boolean): Include inactive categories
- `parentId` (uuid): Filter by parent category

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Food",
        "color": "#FF6B35",
        "icon": "restaurant",
        "parentId": null,
        "isActive": true,
        "sortOrder": 1,
        "subcategories": [
          {
            "id": "uuid",
            "name": "Restaurants",
            "color": "#FF6B35",
            "icon": "restaurant",
            "parentId": "parent_uuid",
            "isActive": true,
            "sortOrder": 1
          }
        ],
        "expenseCount": 45,
        "totalAmount": 1250.50,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /categories
Create a new category.

**Request:**
```json
{
  "name": "Travel",
  "color": "#3498DB",
  "icon": "airplane",
  "parentId": null,
  "sortOrder": 5
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Travel",
      "color": "#3498DB",
      "icon": "airplane",
      "parentId": null,
      "isActive": true,
      "sortOrder": 5,
      "createdAt": "2024-12-04T12:30:00Z"
    }
  },
  "message": "Category created successfully"
}
```

## 💹 Budget Management

### GET /budgets
Get user's budgets.

**Query Parameters:**
- `period` (string): Filter by period (monthly, yearly, weekly)
- `categoryId` (uuid): Filter by category
- `isActive` (boolean): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "id": "uuid",
        "name": "Monthly Food Budget",
        "amount": 500.00,
        "currency": "EUR",
        "periodType": "monthly",
        "startDate": "2024-12-01",
        "endDate": "2024-12-31",
        "category": {
          "id": "uuid",
          "name": "Food",
          "color": "#FF6B35"
        },
        "spent": 345.75,
        "remaining": 154.25,
        "percentage": 69.15,
        "alertThreshold": 80.0,
        "isOverBudget": false,
        "isActive": true,
        "createdAt": "2024-12-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /budgets
Create a new budget.

**Request:**
```json
{
  "name": "Monthly Food Budget",
  "amount": 500.00,
  "currency": "EUR",
  "categoryId": "uuid",
  "periodType": "monthly",
  "startDate": "2024-12-01",
  "endDate": "2024-12-31",
  "alertThreshold": 80.0
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "budget": {
      "id": "uuid",
      "name": "Monthly Food Budget",
      "amount": 500.00,
      "currency": "EUR",
      "periodType": "monthly",
      "startDate": "2024-12-01",
      "endDate": "2024-12-31",
      "isActive": true,
      "createdAt": "2024-12-04T12:30:00Z"
    }
  },
  "message": "Budget created successfully"
}
```

## 📈 Analytics & Reports

### GET /analytics/summary
Get expense summary and analytics.

**Query Parameters:**
- `period` (string): Summary period (month, year, quarter)
- `startDate` (date): Custom start date
- `endDate` (date): Custom end date
- `groupBy` (string): Group by field (category, month, week)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalExpenses": 2450.75,
      "currency": "EUR",
      "expenseCount": 89,
      "averageExpense": 27.54,
      "period": {
        "start": "2024-12-01",
        "end": "2024-12-31"
      }
    },
    "categoryBreakdown": [
      {
        "category": {
          "id": "uuid",
          "name": "Food",
          "color": "#FF6B35"
        },
        "amount": 678.50,
        "percentage": 27.7,
        "count": 25
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-12",
        "amount": 2450.75,
        "count": 89
      }
    ],
    "topExpenses": [
      {
        "id": "uuid",
        "description": "Monthly rent",
        "amount": 1000.00,
        "date": "2024-12-01"
      }
    ]
  }
}
```

### GET /analytics/budget-performance
Get budget performance analytics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budgetPerformance": [
      {
        "budget": {
          "id": "uuid",
          "name": "Monthly Food Budget",
          "amount": 500.00
        },
        "spent": 345.75,
        "remaining": 154.25,
        "percentage": 69.15,
        "status": "on_track", // "on_track", "over_budget", "warning"
        "trend": "increasing" // "increasing", "decreasing", "stable"
      }
    ],
    "overallBudgetHealth": {
      "totalBudget": 2000.00,
      "totalSpent": 1456.75,
      "percentage": 72.84,
      "status": "on_track"
    }
  }
}
```

## 💱 Currency & Exchange Rates

### GET /currencies
Get available currencies.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currencies": [
      {
        "code": "EUR",
        "name": "Euro",
        "symbol": "€",
        "decimalPlaces": 2,
        "isActive": true
      },
      {
        "code": "USD",
        "name": "US Dollar",
        "symbol": "$",
        "decimalPlaces": 2,
        "isActive": true
      }
    ]
  }
}
```

### GET /exchange-rates
Get current exchange rates.

**Query Parameters:**
- `from` (string): Source currency code
- `to` (string): Target currency code
- `date` (date): Specific date for historical rates

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "fromCurrency": "USD",
        "toCurrency": "EUR",
        "rate": 0.86255,
        "rateDate": "2024-12-04",
        "source": "api"
      }
    ],
    "lastUpdated": "2024-12-04T10:00:00Z"
  }
}
```

## 📎 File Management

### POST /uploads/receipts
Upload receipt attachment.

**Request (multipart/form-data):**
```
file: [receipt image/PDF]
expenseId: uuid (optional)
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "attachment": {
      "id": "uuid",
      "filename": "receipt_20241204_123456.jpg",
      "originalFilename": "receipt.jpg",
      "url": "/uploads/receipts/receipt_20241204_123456.jpg",
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "createdAt": "2024-12-04T12:30:00Z"
    }
  },
  "message": "File uploaded successfully"
}
```

### DELETE /uploads/receipts/:id
Delete receipt attachment.

**Response (200):**
```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```

## 🚫 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      }
    ]
  },
  "timestamp": "2024-12-04T12:30:00Z",
  "path": "/api/v1/expenses"
}
```

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Business logic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server errors |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_ERROR` | Invalid credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `BUSINESS_RULE_VIOLATION` | Business logic constraint violated |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

## 🔒 Rate Limiting

### Rate Limits

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 1000 requests | 1 hour |
| File Uploads | 10 requests | 1 minute |
| Bulk Operations | 100 requests | 1 hour |

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
X-RateLimit-Window: 3600
```

---

**API Version**: v1.0.0  
**Last Updated**: December 2024  
**Next Review**: Implementation completion