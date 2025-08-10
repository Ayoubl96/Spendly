# Spendly iOS App

A native iOS application for the Spendly expense tracking platform, built with Swift and SwiftUI.

## Features

The iOS app provides all the core features of the Spendly platform:

### 💰 Expense Management
- Create, edit, and delete expenses
- Categorize expenses with nested categories
- Add notes, vendor information, and payment methods
- Search and filter expenses
- View expense history and trends

### 📊 Dashboard & Analytics
- Overview of monthly spending
- Visual budget progress tracking
- Recent expense summary
- Spending trends and patterns

### 🎯 Budget Tracking
- Create and manage budgets
- Set budget periods (weekly, monthly, yearly, custom)
- Visual budget progress indicators
- Budget alerts and warnings
- Budget groups for comprehensive planning

### 📁 Category Management
- Hierarchical category structure (parent/subcategories)
- Custom colors and icons for categories
- Category-wise expense summaries
- Smart categorization

### 💱 Multi-Currency Support
- Support for multiple currencies
- Real-time exchange rates
- Currency conversion
- Default currency per user

### 👤 User Management
- Secure authentication (login/register)
- User profile management
- Personalized settings
- Secure token storage using Keychain

## Technical Stack

- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI
- **Minimum iOS Version**: iOS 16.0
- **Architecture**: MVVM with ObservableObject
- **Networking**: URLSession with async/await
- **State Management**: @StateObject, @EnvironmentObject
- **Security**: Keychain Services for token storage

## Project Structure

```
ios/
├── Spendly/
│   ├── SpendlyApp.swift           # Main app entry point
│   ├── ContentView.swift          # Root navigation view
│   ├── Models/                    # Data models
│   │   ├── User.swift
│   │   ├── Expense.swift
│   │   ├── Category.swift
│   │   ├── Budget.swift
│   │   └── Currency.swift
│   ├── Views/                     # UI Views
│   │   ├── Auth/
│   │   │   └── LoginView.swift
│   │   ├── Dashboard/
│   │   │   └── DashboardView.swift
│   │   └── PlaceholderViews.swift
│   ├── ViewModels/                # View Models (Stores)
│   │   ├── AuthStore.swift
│   │   ├── ExpenseStore.swift
│   │   ├── BudgetStore.swift
│   │   └── CategoryStore.swift
│   ├── Services/                  # API and services
│   │   └── APIService.swift
│   ├── Utils/                     # Utilities
│   │   ├── KeychainManager.swift
│   │   └── Extensions.swift
│   └── Components/                # Reusable UI components
└── Package.swift                   # Swift Package Manager config
```

## Setup Instructions

### Prerequisites

1. **Xcode 15.0+** installed on macOS
2. **iOS 16.0+** device or simulator
3. **Backend API** running (see main project README)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/spendly.git
cd spendly/ios
```

2. **Open in Xcode**:
```bash
open Package.swift
```
Or double-click the `Package.swift` file to open in Xcode.

3. **Configure API URL**:
   - Open `Services/APIService.swift`
   - Update the `baseURL` to point to your backend:
   ```swift
   private let baseURL = "http://localhost:8000/api/v1"  // For local development
   // or
   private let baseURL = "https://your-api-domain.com/api/v1"  // For production
   ```

4. **Build and Run**:
   - Select your target device/simulator
   - Press `Cmd + R` to build and run
   - Or click the Play button in Xcode

### Environment Configuration

For different environments (development, staging, production), you can:

1. Use Xcode schemes with different environment variables
2. Set the API_URL environment variable in your scheme:
   - Edit Scheme → Run → Arguments → Environment Variables
   - Add: `API_URL = https://your-api-url.com/api/v1`

## Usage

### First Time Setup

1. **Register a new account**:
   - Tap "Register" on the login screen
   - Fill in your details
   - Select your default currency
   - Create account

2. **Login**:
   - Enter your email and password
   - The app will securely store your authentication token

### Adding Expenses

1. Tap the "+" button on the dashboard or expenses tab
2. Enter expense details:
   - Amount
   - Description
   - Date
   - Category (optional)
   - Payment method
   - Notes (optional)
3. Tap "Save"

### Managing Budgets

1. Navigate to the Budgets tab
2. Create a new budget with:
   - Name
   - Amount
   - Period (weekly/monthly/yearly)
   - Category (optional)
3. Track progress on the dashboard

### Filtering Expenses

1. Go to the Expenses tab
2. Use the search bar for quick filtering
3. Tap the filter icon for advanced filters:
   - Date range
   - Category
   - Amount range
   - Payment method

## Key Features Implementation

### Secure Authentication
- JWT token-based authentication
- Secure token storage in iOS Keychain
- Automatic token refresh
- Biometric authentication support (Face ID/Touch ID) - can be added

### Offline Support (Future Enhancement)
- Core Data integration for local storage
- Sync mechanism when online
- Conflict resolution

### Push Notifications (Future Enhancement)
- Budget alerts
- Spending warnings
- Bill reminders

## Development

### Running Tests

```bash
# In Xcode
Cmd + U
```

### Building for Release

1. Select "Any iOS Device" as target
2. Product → Archive
3. Follow the distribution wizard

### Code Style

The project follows Swift standard naming conventions:
- Use `camelCase` for variables and functions
- Use `PascalCase` for types and protocols
- Use meaningful, descriptive names
- Add documentation comments for public APIs

## Troubleshooting

### Common Issues

1. **API Connection Failed**:
   - Verify backend is running
   - Check API URL configuration
   - For localhost, ensure device/simulator can reach your machine

2. **Build Errors**:
   - Clean build folder: `Cmd + Shift + K`
   - Reset package caches: File → Packages → Reset Package Caches

3. **Authentication Issues**:
   - Clear keychain data
   - Verify backend JWT configuration
   - Check token expiration settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Future Enhancements

- [ ] Expense receipt photo capture
- [ ] CSV/Excel import functionality
- [ ] Widgets for quick expense entry
- [ ] Apple Watch companion app
- [ ] Siri shortcuts integration
- [ ] iCloud sync
- [ ] Dark mode optimization
- [ ] Localization support
- [ ] Expense sharing with other users
- [ ] Recurring expense management
- [ ] Bill reminders
- [ ] Export reports (PDF/CSV)
- [ ] Advanced analytics with charts
- [ ] Budget recommendations using ML

## License

This project is part of the Spendly platform. See the main project LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team
- Check the main project documentation

## Acknowledgments

- Built with SwiftUI and modern Swift concurrency
- Uses SF Symbols for consistent iconography
- Follows Apple Human Interface Guidelines