# Spendly - Personal Finance Management Platform

A comprehensive personal finance management platform designed to track expenses, manage budgets, monitor net worth, and provide analytical insights into financial health.

## 🚀 Features

- **📊 Budget Management**: Create and track monthly/yearly budgets with spending limits
- **💰 Expense Tracking**: Quick expense entry with category management and CSV/Excel import
- **📈 Net Worth Tracking**: Monitor assets, liabilities, and investment portfolio
- **📉 Analytics Dashboard**: Visualize spending trends, income vs expenses, and financial growth
- **🔐 Secure Authentication**: JWT-based authentication with secure password handling
- **📱 Responsive Design**: Mobile-friendly interface with modern UI/UX
- **🐳 Containerized**: Docker-based deployment for easy setup and scalability

## 📋 Prerequisites

- Docker and Docker Compose
- Git
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spendly
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - API Documentation: http://localhost/api/docs
   - Backend API: http://localhost:8000
   - Frontend Dev Server: http://localhost:3000

## 📚 Documentation

- [Project Documentation](docs/PROJECT_DOCUMENTATION.md) - Comprehensive project overview
- [Architecture Guide](docs/ARCHITECTURE.md) - Technical architecture details
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) - Step-by-step development guide

## 🏗️ Project Structure

```
spendly/
├── backend/            # FastAPI backend application
│   ├── app/           # Application code
│   ├── tests/         # Test suite
│   └── alembic/       # Database migrations
├── frontend/          # React frontend application
│   ├── src/           # Source code
│   └── public/        # Static assets
├── nginx/             # Nginx reverse proxy configuration
├── docs/              # Documentation
└── docker-compose.yml # Docker orchestration
```

## 🔧 Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Deployment

See [Deployment Guide](docs/IMPLEMENTATION_GUIDE.md#deployment) for production deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with FastAPI, React, PostgreSQL, and Redis
- UI components from Material-UI
- Charts powered by Recharts
