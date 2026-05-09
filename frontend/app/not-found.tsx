import Link from "next/link";

function ShieldLogo() {
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow"
      style={{ background: "linear-gradient(135deg, #ff7ce9 0%, #60a5fa 100%)" }}
      aria-hidden
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
          fill="white"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#012254"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#020617] px-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-[0.12] dark:opacity-[0.20] blur-3xl"
        style={{ background: "radial-gradient(circle, #256af4, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-[0.08] dark:opacity-[0.14] blur-3xl"
        style={{ background: "#ff7ce9" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-12">
          <ShieldLogo />
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-primary">Stellar</span>
            <span className="text-secondary">Proof</span>
          </span>
        </div>

        {/* Gradient 404 number */}
        <p
          className="font-extrabold leading-none tracking-tight text-transparent bg-clip-text select-none mb-6"
          style={{
            fontSize: "clamp(6rem, 20vw, 10rem)",
            backgroundImage: "linear-gradient(135deg, #256af4 20%, #ff7ce9 80%)",
          }}
          aria-label="404"
        >
          404
        </p>

        {/* Divider */}
        <div
          className="h-px w-16 mb-8 rounded-full opacity-40"
          style={{ background: "linear-gradient(90deg, #256af4, #ff7ce9)" }}
          aria-hidden
        />

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
          This page could not be found.
        </h1>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist on StellarProof. It may
          have been moved, removed, or the URL might be incorrect.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-white shadow-button-glow hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#020617] transition-all duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Go Home
        </Link>
      </div>
    </div>
  );
}
