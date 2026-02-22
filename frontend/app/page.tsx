import Header from "@/components/Header";
import HowItWorks from "@/components/HowItWorks";


export default function Home() {
  return (
    <div className="min-h-screen bg-darkblue-dark font-sans">
      <Header />
      <main className="w-full">
        <section
          id="home"
          className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8"
          aria-label="Home"
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl dark:text-white">
            StellarProof
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-foreground/80 dark:text-white/80">
            Web3 authenticity and blockchain verification.
          </p>
        </section>
        <section
          id="about"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="About"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              About
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              About section content.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16" aria-label="How It Works">
          <HowItWorks />
        </section>

        <section
          id="creator"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="Creator"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              Creator
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              Creator ecosystem content.
            </p>
          </div>
        </section>
        <section
          id="developer"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="Developer"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              Developer
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              Developer ecosystem content.
            </p>
          </div>
        </section>
        <section
          id="assets"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="Assets"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              Assets
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              Assets instances content.
            </p>
          </div>
        </section>
        <section
          id="use-cases"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="Use Cases"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              Use Cases
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              Use cases content.
            </p>
          </div>
        </section>
        <section
          id="pricing"
          className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8"
          aria-label="Pricing"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-foreground dark:text-white">
              Pricing
            </h2>
            <p className="mt-4 text-foreground/80 dark:text-white/80">
              Pricing content.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
