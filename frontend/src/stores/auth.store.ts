import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginRequest, RegisterRequest } from '../types/api.types'
import { apiService } from '../services/api.service'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUser: (userData: Partial<User>) => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiService.login(credentials)
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
            user: null,
          })
          throw error
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          await apiService.register(data)
          // After successful registration, automatically log in
          await get().login({
            email: data.email,
            password: data.password,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          })
          throw error
        }
      },

      logout: () => {
        apiService.logout().catch(console.error)
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => {
        set({ error: null })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      refreshUser: async () => {
        if (!get().isAuthenticated) return
        
        try {
          const user = await apiService.getCurrentUser()
          set({ user })
        } catch (error) {
          console.error('Failed to refresh user:', error)
          // If refresh fails, user might need to re-authenticate
          get().logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)