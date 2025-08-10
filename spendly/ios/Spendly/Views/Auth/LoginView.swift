import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authStore: AuthStore
    @State private var email = ""
    @State private var password = ""
    @State private var showingRegister = false
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo and Title
                    VStack(spacing: 16) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                        
                        Text("Spendly")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Track your expenses smartly")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 60)
                    
                    // Login Form
                    VStack(spacing: 16) {
                        TextField("Email", text: $email)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .focused($focusedField, equals: .email)
                        
                        SecureField("Password", text: $password)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .focused($focusedField, equals: .password)
                        
                        if let error = authStore.error {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                                .multilineTextAlignment(.center)
                        }
                        
                        Button(action: login) {
                            HStack {
                                if authStore.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Text("Login")
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(isFormValid ? Color.blue : Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                        .disabled(!isFormValid || authStore.isLoading)
                    }
                    .padding(.horizontal)
                    
                    // Register Link
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.secondary)
                        
                        Button("Register") {
                            showingRegister = true
                        }
                        .foregroundColor(.blue)
                    }
                    .font(.footnote)
                    
                    Spacer()
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingRegister) {
                RegisterView()
            }
            .onSubmit {
                if focusedField == .email {
                    focusedField = .password
                } else {
                    login()
                }
            }
        }
    }
    
    private var isFormValid: Bool {
        !email.isEmpty && email.isValidEmail && !password.isEmpty
    }
    
    private func login() {
        guard isFormValid else { return }
        
        Task {
            await authStore.login(email: email, password: password)
        }
    }
}

struct RegisterView: View {
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) var dismiss
    
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var selectedCurrency = "EUR"
    
    let currencies = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Personal Information") {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                }
                
                Section("Account Details") {
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $password)
                    SecureField("Confirm Password", text: $confirmPassword)
                    
                    Picker("Default Currency", selection: $selectedCurrency) {
                        ForEach(currencies, id: \.self) { currency in
                            Text(currency).tag(currency)
                        }
                    }
                }
                
                if let error = authStore.error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button(action: register) {
                        HStack {
                            Spacer()
                            if authStore.isLoading {
                                ProgressView()
                            } else {
                                Text("Create Account")
                            }
                            Spacer()
                        }
                    }
                    .disabled(!isFormValid || authStore.isLoading)
                }
            }
            .navigationTitle("Register")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() }
            )
        }
    }
    
    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        email.isValidEmail &&
        password.count >= 6 &&
        password == confirmPassword
    }
    
    private func register() {
        guard isFormValid else { return }
        
        Task {
            await authStore.register(
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                currency: selectedCurrency
            )
            
            if authStore.isAuthenticated {
                dismiss()
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthStore())
}