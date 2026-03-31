import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequestRow from "@/components/dashboard/RequestRow";
import { mockRequest } from "@/services/mockRequests";

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
