# Contributing to StellarProof

Thank you for your interest in contributing to **StellarProof**! We welcome contributions from the community to help build the Truth Engine for the Stellar Ecosystem. Whether you're a developer, designer, or enthusiast, your help is valuable in enabling trust, transparency, and verifiable digital truth.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/StellarProof.git
    cd StellarProof
    ```
3.  **Install dependencies**:
    We use `pnpm` as our package manager.
    ```bash
    pnpm install
    ```
4.  **Create a branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/my-new-feature
    ```

## Development Workflow

StellarProof is a monorepo consisting of several key components:

*   **Frontend (`frontend/`)**: Next.js + TypeScript application for the user interface.
*   **Oracle Worker (`oracle-worker/`)**: Node.js worker that orchestrates TEE verification.
*   **Smart Contracts (`contracts/`)**: Soroban (Rust) smart contracts for on-chain provenance.
*   **Services (`services/`)**: Shared services for Storage (IPFS/MongoDB), KMS, and Stellar integration.

### Prerequisites

You will need the following installed:

*   **Node.js**: Version 20 or later. [Download](https://nodejs.org/)
*   **pnpm**: Package manager. [Installation Guide](https://pnpm.io/installation)
*   **Rust**: Latest stable toolchain. [Installation Guide](https://www.rust-lang.org/tools/install)
*   **Stellar CLI / Soroban CLI**: For compiling and deploying contracts. [Installation Guide](https://developers.stellar.org/docs/smart-contracts/getting-started/setup)
*   **(Optional) Docker**: Useful for running local services like IPFS or MongoDB.

### Detailed Setup

#### 1. Smart Contracts Setup

The contracts are the backbone of StellarProof. You should compile them first to ensure the WASM binaries are available.

```bash
cd contracts
# Build release binaries
cargo build --target wasm32-unknown-unknown --release
# OR using Stellar CLI
stellar contract build
```

#### 2. Frontend Setup

The frontend is a Next.js application.

```bash
cd frontend
pnpm dev
```
The app will be available at `http://localhost:3000`.

#### 3. Oracle Worker Setup

The Oracle Worker handles off-chain verification tasks.

```bash
cd oracle-worker
pnpm dev
```

### Running Tests

**Frontend & Worker Tests:**
```bash
# Run tests for all packages
pnpm test
```

**Smart Contract Tests:**
```bash
cd contracts
cargo test
```

## Feature Requests & Voting

We believe the community should drive the project's priorities.

### Requesting a New Feature

1.  **Check existing requests**: Browse existing Issues to see if someone has already suggested it.
2.  **Open an Issue**: If your idea is new, open a GitHub Issue with the label `feature-request`. Include:
    *   A clear, descriptive title.
    *   The problem or use case you're trying to solve.
    *   Your proposed solution or approach.
    *   Any relevant examples or context.

### Voting on Features

*   **Use reactions**: Vote for features you'd like to see by adding a 👍 (thumbs up) reaction to the original issue description.
*   **Priority ranking**: Features with the most 👍 reactions will be prioritized in our development roadmap.

## Submitting a Pull Request

1.  **Ensure all tests pass**: Run `cargo test` for contracts and `pnpm test` for JS/TS packages.
2.  **Update documentation**: If you change functionality, please update `README.md` or relevant docs.
3.  **Format your code**:
    *   For Rust: `cargo fmt`
    *   For JS/TS: `pnpm format` (or ensure Prettier is running)
4.  **Submit your PR** to the `main` branch. Provide a clear description of what your changes do.

## License

By contributing, you agree that your contributions will be licensed under the **MIT License**, same as the project.
