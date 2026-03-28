export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  message: string;
}

export interface AuthService {
  register(data: RegisterFormData): Promise<RegisterResult>;
}

async function register(data: RegisterFormData): Promise<RegisterResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock: reject duplicate email for testing
  if (data.email.toLowerCase() === "taken@stellarproof.com") {
    return {
      success: false,
      message: "An account with this email already exists.",
    };
  }

  return {
    success: true,
    message: "Account created successfully. Welcome to StellarProof!",
  };
}

export const authService: AuthService = {
  register,
};
