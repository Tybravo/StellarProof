import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CertificateCard from "./CertificateCard";
import type { ProvenanceCertificate } from "@/services/certificate";

const certificate: ProvenanceCertificate = {
  id: "CERT-ONCHAIN-555",
  ownerAddress: "GABC123OWNER456",
  mintedAt: "2026-11-24T10:00:00.000Z",
  manifestHash: "manifest-hash-from-chain",
  contentHash: "content-hash-from-chain",
  attestationHash: "attestation-hash-from-chain",
};

describe("CertificateCard", () => {
  it("renders a loading skeleton while chain data is loading", () => {
    render(<CertificateCard certificate={null} isLoading />);

    expect(screen.getByTestId("certificate-card-skeleton")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("renders a recoverable error state", async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(
      <CertificateCard
        certificate={null}
        error="Certificate lookup failed"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Certificate lookup failed");
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the actual on-chain certificate fields", () => {
    render(<CertificateCard certificate={certificate} />);

    expect(screen.getByText("Verified on Stellar")).toBeInTheDocument();
    expect(screen.getByTestId("certificate-id")).toHaveTextContent(certificate.id);
    expect(screen.getByText(certificate.ownerAddress)).toBeInTheDocument();
    expect(screen.getByText(certificate.manifestHash)).toBeInTheDocument();
    expect(screen.getByText(certificate.contentHash)).toBeInTheDocument();
    expect(screen.getByText(certificate.attestationHash)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeEnabled();
  });
});
