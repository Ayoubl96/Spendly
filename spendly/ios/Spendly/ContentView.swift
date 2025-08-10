import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authStore: AuthStore
    
    var body: some View {
        Group {
            if authStore.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authStore.isAuthenticated)
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie")
                }
                .tag(0)
            
            ExpensesView()
                .tabItem {
                    Label("Expenses", systemImage: "creditcard")
                }
                .tag(1)
            
            BudgetsView()
                .tabItem {
                    Label("Budgets", systemImage: "chart.bar")
                }
                .tag(2)
            
            CategoriesView()
                .tabItem {
                    Label("Categories", systemImage: "folder")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(4)
        }
        .accentColor(.blue)
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthStore())
        .environmentObject(ExpenseStore())
        .environmentObject(BudgetStore())
        .environmentObject(CategoryStore())
}