import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { AuthProvider } from "@/app/context/AuthContext";

const mockUsePathname = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

function renderSidebar() {
  return render(
    <AuthProvider>
      <ModalProvider>
        <DashboardSidebar />
      </ModalProvider>
    </AuthProvider>
  );
}

describe("DashboardSidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  it("renders a link for every dashboard section", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    renderSidebar();

    expect(screen.getAllByRole("link", { name: /overview/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /assets/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /billing/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /settings/i }).length).toBeGreaterThan(0);
  });

  it("marks the current route as active via aria-current", () => {
    mockUsePathname.mockReturnValue("/dashboard/assets");
    renderSidebar();

    const activeLinks = screen.getAllByRole("link", { name: /assets/i });
    expect(activeLinks[0]).toHaveAttribute("aria-current", "page");

    const overviewLinks = screen.getAllByRole("link", { name: /overview/i });
    expect(overviewLinks[0]).not.toHaveAttribute("aria-current");
  });

  it("treats nested routes under a section as active", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings/subscription");
    renderSidebar();

    const settingsLinks = screen.getAllByRole("link", { name: /settings/i });
    expect(settingsLinks[0]).toHaveAttribute("aria-current", "page");
  });

  it("only marks the dashboard overview link active on the exact root route", () => {
    mockUsePathname.mockReturnValue("/dashboard/billing");
    renderSidebar();

    const overviewLinks = screen.getAllByRole("link", { name: /overview/i });
    expect(overviewLinks[0]).not.toHaveAttribute("aria-current");
  });

  it("opens and closes the mobile drawer via the menu toggle", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const user = userEvent.setup();
    renderSidebar();

    const toggle = screen.getByRole("button", { name: /open dashboard menu/i });
    expect(screen.queryByRole("dialog", { name: /dashboard navigation/i })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("dialog", { name: /dashboard navigation/i })).toBeInTheDocument();

    const closeToggle = screen.getByRole("button", { name: /close dashboard navigation/i });
    await user.click(closeToggle);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /dashboard navigation/i })).not.toBeInTheDocument()
    );
  });
});
