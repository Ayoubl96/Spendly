import Foundation
import SwiftUI
import Combine

@MainActor
class AuthStore: ObservableObject {
    @Published var user: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService.shared
    
    init() {
        checkAuthStatus()
    }
    
    func checkAuthStatus() {
        if KeychainManager.shared.getToken() != nil {
            Task {
                await refreshUser()
            }
        }
    }
    
    func login(email: String, password: String) async {
        isLoading = true
        error = nil
        
        do {
            let (_, user) = try await apiService.login(email: email, password: password)
            self.user = user
            self.isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func register(firstName: String, lastName: String, email: String, password: String, currency: String) async {
        isLoading = true
        error = nil
        
        let request = RegisterRequest(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            defaultCurrency: currency
        )
        
        do {
            _ = try await apiService.register(request)
            // Auto-login after registration
            await login(email: email, password: password)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func logout() async {
        isLoading = true
        
        do {
            try await apiService.logout()
        } catch {
            // Even if API logout fails, clear local state
        }
        
        user = nil
        isAuthenticated = false
        isLoading = false
    }
    
    func refreshUser() async {
        do {
            user = try await apiService.getCurrentUser()
            isAuthenticated = true
        } catch {
            // If refresh fails, user needs to login again
            isAuthenticated = false
        }
    }
    
    func updateProfile(_ updatedUser: User) async {
        isLoading = true
        error = nil
        
        do {
            user = try await apiService.updateProfile(updatedUser)
        } catch {
            self.error = error.localizedDescription
        }
        
        isLoading = false
    }
}