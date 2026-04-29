import type { Metadata } from "next";
import { CertificateView } from "@/components/certificate/CertificateView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Certificate ${id} — StellarProof`,
    description: "View and verify a StellarProof provenance certificate secured by Soroban smart contracts.",
  };
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#020617] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <CertificateView certificateId={id} />
      </div>
    </main>
  );
}
