import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestRow, { type Request } from "@/components/dashboard/RequestRow";

const mockRequest: Request = {
  id: "req-1",
  hash: "0x1234abcd",
  fullHash: "0x1234abcd5678efgh9012ijkl3456mnop7890qrst",
  manifest: "bafy-manifest",
  attestation: "bafy-attestation",
  timestamp: "2026-01-01T00:00:00.000Z",
  txHash: "ab".repeat(32),
  certificateUrl: "https://example.com/certificate.pdf",
  status: "verified",
  registryStatus: "verified",
};

describe("RequestRow", () => {
  it("renders collapsed row and expands on click", async () => {
    const user = userEvent.setup();
    render(<RequestRow request={mockRequest} />);

    // collapsed: short hash shown
    expect(screen.getByText(/0x1234/i)).toBeInTheDocument();

    // details not visible initially
    expect(screen.queryByText(/Details/i)).not.toBeInTheDocument();

    // click to expand
    const header = screen.getByRole("button", { name: /0x1234/i });
    await user.click(header);

    // now details should appear
    expect(screen.getByText(/Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Hash/i)).toBeInTheDocument();
    expect(screen.getByText(/registry:/i)).toBeInTheDocument();
  });

  it("copies field value and shows feedback", async () => {
    const user = userEvent.setup();
    render(<RequestRow request={mockRequest} />);

    const header = screen.getByRole("button", { name: /0x1234/i });
    await user.click(header);

    const copyButtons = screen.getAllByRole("button", { name: /copy/i });
    await user.click(copyButtons[0]);

    expect(screen.getAllByText(/Copied!/i).length).toBeGreaterThan(0);
  });

  it("hides certificate link when certificateUrl is missing", async () => {
    const user = userEvent.setup();
    const requestWithoutCert = { ...mockRequest, certificateUrl: undefined };

    render(<RequestRow request={requestWithoutCert} />);

    const header = screen.getByRole("button", { name: /0x1234/i });
    await user.click(header);

    expect(screen.getByRole("link", { name: /View Tx/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /View Certificate/i }),
    ).not.toBeInTheDocument();
  });
});
