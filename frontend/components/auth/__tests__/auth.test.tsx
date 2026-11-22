import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "@/components/auth/RegisterForm";
import LoginForm from "@/components/auth/LoginForm";
import AuthGuard from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/app/context/AuthContext";
import { SESSION_STORAGE_KEY } from "@/services/session";
import { registerSchema } from "@/utils/authSchemas";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockAddToast = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

function makeJwt(expSeconds: number) {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `h.${payload}.s`;
}

const futureJwt = () => makeJwt(Math.floor(Date.now() / 1000) + 3600);

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  global.fetch = jest.fn();
});

describe("registerSchema", () => {
  const valid = {
    fullName: "Ada Bebe",
    email: "ada@example.com",
    password: "Str0ng!pass",
    confirmPassword: "Str0ng!pass",
  };

  it("accepts valid data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    [{ password: "short1!", confirmPassword: "short1!" }, "at least 8"],
    [{ password: "lowercase1!", confirmPassword: "lowercase1!" }, "uppercase"],
    [{ password: "NoNumber!!", confirmPassword: "NoNumber!!" }, "number"],
    [{ password: "NoSpecial11", confirmPassword: "NoSpecial11" }, "special"],
    [{ confirmPassword: "Different1!" }, "do not match"],
    [{ email: "not-an-email" }, "valid email"],
    [{ fullName: "A" }, "at least 2"],
  ])("rejects %j", (override, message) => {
    const result = registerSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(message);
  });
});

describe("RegisterForm", () => {
  it("shows validation errors and does not call the API for invalid input", async () => {
    const user = userEvent.setup();
    renderWithAuth(<RegisterForm />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("registers, signs in and redirects on success", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse(201, { data: { user: { email: "ada@example.com" } } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { token: futureJwt(), user: { id: "1", email: "ada@example.com" } } }),
      );
    const user = userEvent.setup();
    renderWithAuth(<RegisterForm />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Bebe");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Str0ng!pass");
    await user.type(screen.getByLabelText("Confirm Password"), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!).user.name).toBe("Ada Bebe");
  });

  it("surfaces the API error for a duplicate email", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse(409, { message: "An account with this email already exists." }),
    );
    const user = userEvent.setup();
    renderWithAuth(<RegisterForm />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Bebe");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Str0ng!pass");
    await user.type(screen.getByLabelText("Confirm Password"), "Str0ng!pass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith({
        type: "error",
        message: "An account with this email already exists.",
      }),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("LoginForm", () => {
  it("blocks submission when fields are empty", async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stores the JWT and redirects to the dashboard on success", async () => {
    const token = futureJwt();
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse(200, { data: { token, user: { id: "1", email: "ada@example.com" } } }),
    );
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!).token).toBe(token);
  });

  it("shows an error and stores nothing when credentials are rejected", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      jsonResponse(401, { message: "Invalid credentials" }),
    );
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    );
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("AuthGuard", () => {
  it("redirects unauthenticated users to /login and hides content", async () => {
    renderWithAuth(
      <AuthGuard>
        <p>secret dashboard</p>
      </AuthGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret dashboard")).not.toBeInTheDocument();
  });

  it("renders children for a valid stored session", async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ isAuthenticated: true, token: futureJwt(), user: { email: "a@b.co" } }),
    );
    renderWithAuth(
      <AuthGuard>
        <p>secret dashboard</p>
      </AuthGuard>,
    );

    expect(await screen.findByText("secret dashboard")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("treats an expired token as unauthenticated and clears it", async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        isAuthenticated: true,
        token: makeJwt(Math.floor(Date.now() / 1000) - 10),
        user: { email: "a@b.co" },
      }),
    );
    renderWithAuth(
      <AuthGuard>
        <p>secret dashboard</p>
      </AuthGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
