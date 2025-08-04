# 🚀 Quick Start Guide

Get your Spendly expense tracking platform up and running in minutes!

## ⚡ Instant Setup (5 minutes)

### Step 1: Prerequisites Check
```bash
# Verify Docker is installed
docker --version
docker-compose --version

# If not installed:
# curl -fsSL https://get.docker.com -o get-docker.sh
# sudo sh get-docker.sh
```

### Step 2: Clone and Configure
```bash
# Clone the repository
git clone <your-repository-url>
cd spendly

# Copy environment configuration
cp env.example .env

# Quick edit for basic setup (optional)
nano .env
```

### Step 3: Launch Development Environment
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs (optional)
docker-compose logs -f backend
```

### Step 4: Access Your Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Database Admin**: http://localhost:8080 (adminer)
- **Email Testing**: http://localhost:8025 (mailhog)

## 🎯 First Use

### 1. Create Your Account
```bash
# Open browser and go to: http://localhost:3000
# Click "Sign Up" and create your first account
```

### 2. Import Your Excel Data (Optional)
```bash
# Navigate to Settings > Import Data
# Upload your Excel file: "2024 - Ayoub Expenses - Personal.xlsx"
# Review and confirm the import
```

### 3. Start Tracking Expenses
- Add your first expense
- Set up categories
- Create monthly budgets
- Explore the dashboard

## 🏗️ Production Deployment

### For Local Server Deployment:
```bash
# Copy production environment
cp env.example .env.production

# Edit production settings
nano .env.production

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Access via: http://your-server-ip
```

## 🔧 Common Commands

```bash
# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# Backup database
docker-compose exec database pg_dump -U postgres spendly_dev > backup.sql

# Access database
docker-compose exec database psql -U postgres spendly_dev

# Clear all data and restart
docker-compose down -v
docker-compose up -d
```

## 📊 Excel Migration Helper

### Automatic Migration Script
```bash
# Run the migration tool
docker-compose exec backend python -m app.scripts.excel_migration

# Upload your Excel file through the web interface
# Go to: Settings > Data Import > Upload Excel File
```

### Manual Data Entry
1. **Categories Setup**: Create your expense categories first
   - Housing, Transport, Food, Entertainment, etc.
   
2. **Currency Setup**: Configure your currencies
   - EUR, USD, CHF, MAD (as per your Excel)
   
3. **Budget Setup**: Set monthly budgets
   - Based on your spending patterns

## 🚨 Troubleshooting

### Services Won't Start
```bash
# Check port conflicts
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill conflicting processes
kill -9 <PID>

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d database
sleep 10
docker-compose up -d
```

### Cannot Access Web Interface
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs frontend
docker-compose logs nginx

# Verify network connectivity
curl http://localhost:3000
curl http://localhost:8000/health
```

### File Upload Issues
```bash
# Check upload directory permissions
docker-compose exec backend ls -la /app/uploads

# Create upload directory if missing
docker-compose exec backend mkdir -p /app/uploads
```

## 🎛️ Configuration Quick Reference

### Environment Variables (.env)
```bash
# Essential Settings
ENVIRONMENT=development
DB_PASSWORD=change_this_password
JWT_SECRET=change_this_long_secret
REDIS_PASSWORD=change_this_redis_password

# Currency API (Optional)
CURRENCY_API_KEY=your_api_key_here

# Email Settings (Optional)
SMTP_HOST=your-smtp-server
SMTP_USER=your-email
SMTP_PASS=your-password
```

### Default Login (After First Setup)
- Create your account via the web interface
- No default credentials - registration required

## 📱 Feature Overview

### ✅ Available Features
- ✅ **Expense Tracking**: Add, edit, delete expenses
- ✅ **Multi-Currency**: EUR, USD, CHF, MAD support
- ✅ **Categories**: Primary and secondary categorization
- ✅ **Monthly Views**: Organize expenses by month
- ✅ **Budget Tracking**: Set and monitor budgets
- ✅ **File Uploads**: Attach receipts
- ✅ **Analytics**: Spending summaries and charts
- ✅ **Data Export**: CSV and PDF exports

### 🚧 Planned Features
- 🚧 **Net Worth Tracking**: Assets and liabilities
- 🚧 **Income Management**: Track income sources
- 🚧 **Shared Expenses**: Split bills with others
- 🚧 **Mobile App**: React Native companion
- 🚧 **AI Categorization**: Auto-categorize expenses

## 🔄 Updates

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Restart with new code
docker-compose down
docker-compose up -d

# Run any new migrations
docker-compose exec backend npm run migrate
```

### Backing Up Data
```bash
# Create backup directory
mkdir -p backups

# Backup database
docker-compose exec database pg_dump -U postgres spendly_dev > backups/database_$(date +%Y%m%d).sql

# Backup uploaded files
tar -czf backups/uploads_$(date +%Y%m%d).tar.gz data/uploads/

# Backup configuration
cp .env backups/env_$(date +%Y%m%d).backup
```

## 🆘 Need Help?

### Check the Documentation
- [Development Guide](docs/development/README.md)
- [API Documentation](docs/api/README.md)
- [Database Design](docs/database/README.md)
- [Deployment Guide](docs/deployment/README.md)

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Change port in docker-compose.yml |
| Database won't start | Check disk space and permissions |
| Can't upload files | Verify upload directory exists |
| Slow performance | Increase Docker memory allocation |
| Frontend blank page | Check browser console for errors |

### System Requirements
- **Minimum**: 2GB RAM, 20GB storage
- **Recommended**: 4GB RAM, 50GB storage
- **Optimal**: 8GB RAM, 100GB storage

---

## 🎉 You're Ready!

Your Spendly expense tracking platform should now be running. Start by:

1. 📝 Creating your first account
2. 💰 Adding your first expense
3. 📊 Setting up categories and budgets
4. 📈 Exploring the analytics dashboard

**Happy expense tracking!** 🎯

---

*Deployment time: ~5 minutes*  
*Full setup time: ~15 minutes*  
*Excel migration: ~30 minutes*