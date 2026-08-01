import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Web2DashboardView from "../Web2DashboardView";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("Web2DashboardView", () => {
  it("renders email user header and quick actions", async () => {
    render(<Web2DashboardView userEmail="testuser@stellarproof.com" userName="Test User" />);

    expect(screen.getByText("testuser@stellarproof.com")).toBeInTheDocument();
    expect(screen.getByText(/Verify Authenticity/i)).toBeInTheDocument();
    expect(screen.getByText(/My Products/i)).toBeInTheDocument();
  });

  it("defaults to 'My Products' section on initial load", async () => {
    render(<Web2DashboardView userEmail="testuser@stellarproof.com" />);

    // Check header for My Verified Products
    await waitFor(() => {
      expect(screen.getByText("My Verified Products")).toBeInTheDocument();
    });

    // Check that products are loaded from mock service
    await waitFor(() => {
      expect(screen.getByText("Limited Edition Digital Artwork")).toBeInTheDocument();
    });
  });

  it("switches tabs when tab buttons are clicked", async () => {
    render(<Web2DashboardView userEmail="testuser@stellarproof.com" />);

    await waitFor(() => {
      expect(screen.getByText("My Verified Products")).toBeInTheDocument();
    });

    // Click on Verification Requests tab
    const requestsTab = screen.getByRole("button", { name: /Verification Requests/i });
    fireEvent.click(requestsTab);

    await waitFor(() => {
      expect(screen.getByText("Product Verification Requests")).toBeInTheDocument();
    });

    // Click on Certificates tab
    const certsTab = screen.getByRole("button", { name: /Certificates/i });
    fireEvent.click(certsTab);

    await waitFor(() => {
      expect(screen.getByText("Digital Certificates")).toBeInTheDocument();
    });
  });

  it("switches to 'My Products' when Quick Action 'My Products' is clicked", async () => {
    render(<Web2DashboardView userEmail="testuser@stellarproof.com" />);

    // Switch away first
    const requestsTab = screen.getByRole("button", { name: /Verification Requests/i });
    fireEvent.click(requestsTab);

    await waitFor(() => {
      expect(screen.getByText("Product Verification Requests")).toBeInTheDocument();
    });

    // Click Quick Action 'My Products'
    const myProductsQuickAction = screen.getAllByText("My Products")[0];
    fireEvent.click(myProductsQuickAction);

    await waitFor(() => {
      expect(screen.getByText("My Verified Products")).toBeInTheDocument();
    });
  });
});
