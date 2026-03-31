import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportActions, CertificateData } from "./ExportActions";

describe("ExportActions", () => {
  const mockCertificate: CertificateData = {
    owner: "0xMockOwner123",
    certificate_id: "CERT-999000",
    manifest_hash: "0xManifest888",
    content_hash: "0xContent777",
    attestation_hash: "0xAttestation666",
    timestamp: "1710000000",
    network: "ethereum",
  };

  beforeAll(() => {
    // Mock URL methods since they are not implemented in JSDOM
    window.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders download button", () => {
    render(<ExportActions certificate={mockCertificate} />);
    expect(screen.getByRole("button", { name: /Download JSON/i })).toBeInTheDocument();
  });

  it("disables button when no certificate data is provided", () => {
    render(<ExportActions certificate={null} />);
    const button = screen.getByRole("button", { name: /Download JSON/i });
    expect(button).toBeDisabled();
  });

  it("disables button when isLoading is true", () => {
    render(<ExportActions certificate={mockCertificate} isLoading={true} />);
    const button = screen.getByRole("button", { name: /Download JSON/i });
    expect(button).toBeDisabled();
  });

  it("downloads certificate data as JSON on form submission/button click", async () => {
    const user = userEvent.setup();
    const mockAppendedLink = { click: jest.fn() } as unknown as HTMLAnchorElement;
    
    // Mock the document.createElement selectively for 'a'
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") return mockAppendedLink;
      return originalCreateElement(tagName);
    });

    const mockAppendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => null as any);
    const mockRemoveChild = jest.spyOn(document.body, "removeChild").mockImplementation(() => null as any);

    render(<ExportActions certificate={mockCertificate} />);
    
    const button = screen.getByRole("button", { name: /Download JSON/i });
    await user.click(button);

    // Ensure Blob was created with correct JSON and URL was generated
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    const callArgs = (window.URL.createObjectURL as jest.Mock).mock.calls[0];
    const createdBlob = callArgs[0] as Blob;
    expect(createdBlob.type).toBe("application/json");
    
    // verify the appended element properties
    expect(mockAppendedLink.download).toBe("stellarproof-certificate-CERT-999000.json");
    expect(mockAppendedLink.href).toBe("blob:mock-url");
    
    // verify click and append/remove actions occurred
    expect(mockAppendChild).toHaveBeenCalledWith(mockAppendedLink);
    expect(mockAppendedLink.click).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAppendedLink);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    // Clean up
    jest.restoreAllMocks();
  });
});
