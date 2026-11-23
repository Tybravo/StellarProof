import Header from "@/components/Header";

import FiatCheckout from "./FiatCheckout";

export const metadata = {
  title: "Secure card checkout | StellarProof",
  description: "Pay for your StellarProof plan with a credit or debit card via Stripe.",
};

export default function FiatCheckoutPage() {
  return (
    <div data-testid="fiat-checkout-page" className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      <Header />
      <main
        id="main-content"
        className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_420px]"
      >
        <FiatCheckout />
      </main>
    </div>
  );
}
