# Contributing to StellarProof Backend

Welcome to the StellarProof Backend! We are thrilled that you want to contribute to the Truth Engine for the Stellar Ecosystem. This document outlines the architecture, setup instructions, and best practices specifically for the backend directory.

If you haven't already, please read the [Root CONTRIBUTING.md](../../CONTRIBUTING.md) for general guidelines on branching, PRs, and commit messages.

---

## 🏗️ Architecture Overview

The backend is built with:
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** MongoDB (using Mongoose ODM)
*   **Package Manager:** pnpm (Managed as a workspace in the monorepo)

The primary goal of this backend is to handle the core business logic (Web2.5 flow), orchestration of Verification Jobs, and caching of On-Chain Provenance Certificates.

---

## 🚀 Getting Started

### 1. Request Database Credentials
We use MongoDB Atlas for our shared development database. 
*   **Action Required:** Please comment on the Git Issue you are assigned to and ask the maintainer for the `MONGODB_URI` connection string.
*   *Alternative:* You can set up a local MongoDB instance and use `mongodb://localhost:27017/stellarproof`.

### 2. Environment Setup
1. Duplicate the `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Paste the `MONGODB_URI` provided by the maintainer into your `.env` file.

### 3. Install Dependencies
Always run `pnpm install` from the **root** of the monorepo, or inside the backend folder:
```bash
cd backend
pnpm install
```

### 4. Run the Development Server
```bash
pnpm dev
```
You should see:
```text
Server is running on port 4000
MongoDB Connected: <cluster-url>
```

---

## 📂 Folder Structure

Please adhere to the following folder structure when adding new features:

```text
backend/src/
├── config/         # Environment variables and database connection setup
├── controllers/    # Request handling, response formatting (Keep logic thin here)
├── middlewares/    # Express middlewares (Auth guards, error handlers, rate limiting)
├── models/         # Mongoose Schemas and Interfaces
├── routes/         # Express route definitions
├── services/       # Core business logic (Heavy lifting goes here)
└── utils/          # Helper functions, crypto hashing, formatting
```

---

## 🛠️ Development Best Practices

### 1. The Controller-Service Pattern
To keep the codebase maintainable, we strictly separate route handling from business logic.
*   **Controllers (`/controllers`):** Should only extract data from `req` (params, body, headers), call a Service, and return a `res` (status code + JSON).
*   **Services (`/services`):** Should contain the actual business logic, database queries, and external API calls. Services should *not* know about Express `req` or `res` objects.

### 2. TypeScript Guidelines
*   **No `any` types:** Always define proper interfaces or types. If you are updating a Mongoose model, make sure to update the exported `I<ModelName>` interface at the top of the file.
*   **Strict Mode:** We have `"strict": true` enabled in `tsconfig.json`. Do not bypass it.

### 3. Working with Mongoose Models
The core models (`User`, `Manifest`, `Asset`, `VerificationJob`, `Certificate`) have already been scaffolded in `src/models/`.
*   If your issue requires you to implement business logic within the model (e.g., hashing a password before saving), look for the `// Contributors:` comments inside the model files for guidance.
*   Use Mongoose `pre-save` hooks for data transformation (like `bcryptjs` hashing) rather than doing it in the controller.

### 4. Authentication Flow (Web2.5)
StellarProof uses a "Web2.5" approach:
1.  **Web2 Sign-up:** Users register with Email and Password.
2.  **Web3 Link:** Users optionally link their Stellar Wallet (Freighter) later, which populates the `stellarPublicKey` field in their profile.

When working on Auth routes, always assume `stellarPublicKey` might be `null` or `undefined` until the user explicitly connects a wallet.

### 5. Error Handling
*   Do not leave `console.log()` statements in production-ready code (except for server startup logs).
*   Use standard HTTP status codes:
    *   `200 OK` / `201 Created` for success
    *   `400 Bad Request` for validation errors
    *   `401 Unauthorized` for missing/invalid tokens
    *   `403 Forbidden` for permission issues
    *   `404 Not Found` for missing resources
    *   `500 Internal Server Error` for unexpected crashes

---

## 🧪 Testing (Coming Soon)
We will be using `Jest` and `Supertest` for backend API testing. If your issue requires tests, ensure they are placed in a `__tests__` directory alongside the feature you are building.

---

Thank you for contributing to StellarProof! If you get stuck, feel free to ask questions in your assigned Git Issue. Happy coding! 🚀
