import { CertificateData } from "@/components/certificate/ExportActions";

// Mock data service as requested: "Use mock data in the service layer; do not hard-code data during development."
export const fetchMockCertificate = async (id: string): Promise<CertificateData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        owner: "0x1234567890abcdef1234567890abcdef12345678",
        certificate_id: id,
        manifest_hash: "0xabcdef1234567890abcdef1234567890abcdef12",
        content_hash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        attestation_hash: "0x0000000000000000000000000000000000000000",
        timestamp: new Date().toISOString(),
        network: "Stellar",
      });
    }, 500); // Simulate network delay
  });
};
