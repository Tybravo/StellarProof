import { render, screen } from "@testing-library/react";
import CertificatePage, { generateMetadata } from "../[id]/page";

jest.mock("@/components/certificate/CertificateView", () => ({
  CertificateView: ({ certificateId }: { certificateId: string }) => <div>cert:{certificateId}</div>,
}));

describe("public certificate page", () => {
  it("renders without any wallet or auth provider", async () => {
    render(await CertificatePage({ params: Promise.resolve({ id: "cert-demo-001" }) }));
    expect(screen.getByText("cert:cert-demo-001")).toBeInTheDocument();
  });

  it("generates indexable, shareable metadata", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ id: "abc" }) });
    expect(String(meta.title)).toContain("abc");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.openGraph?.title).toContain("abc");
  });
});
