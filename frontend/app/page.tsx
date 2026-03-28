import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import About from "@/components/About";
import HowItWorks from "@/components/HowItWorks";
import Ecosystem from "@/components/Ecosystem";
import CallToAction from "@/components/CallToAction";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans selection:bg-primary/30">
      <Header />
      <main className="w-full">
        <HeroSection />
        <About />
        <HowItWorks />
        <Ecosystem />
        <CallToAction />
      </main>
    </div>
  );
}