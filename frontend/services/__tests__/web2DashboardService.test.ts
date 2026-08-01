import { web2DashboardService } from "../web2DashboardService";

describe("web2DashboardService", () => {
  it("fetches Web2 user products with valid structures", async () => {
    const products = await web2DashboardService.getWeb2UserProducts("user@example.com");
    expect(products.length).toBeGreaterThan(0);
    const p1 = products[0];
    expect(p1.id).toBeDefined();
    expect(p1.name).toBeDefined();
    expect(p1.status).toBeDefined();
    expect(p1.manifest).toBeDefined();
    expect(p1.attestation).toBeDefined();
  });

  it("fetches verification requests", async () => {
    const requests = await web2DashboardService.getWeb2VerificationRequests("user@example.com");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].requestId).toBeDefined();
    expect(requests[0].status).toBeDefined();
  });

  it("fetches manifests, attestations, and certificates", async () => {
    const manifests = await web2DashboardService.getWeb2Manifests();
    const attestations = await web2DashboardService.getWeb2Attestations();
    const certificates = await web2DashboardService.getWeb2Certificates();

    expect(manifests.length).toBeGreaterThan(0);
    expect(attestations.length).toBeGreaterThan(0);
    expect(certificates.length).toBeGreaterThan(0);
  });
});
