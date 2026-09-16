import Link from "next/link";
import { HowToTabs } from "@/components/HowToTabs";

export default function HowToWorksPage() {
  return (
    <section id="howto" className="screen howto-screen active">
      <div className="howto-shell">
        <div className="howto-hero">
          <Link href="/" className="back howto-back">
            ‹
          </Link>
          <div>
            <span className="howto-overline">GET STARTED</span>
            <h1>How It Works</h1>
            <p>Pick a game below to see how it works.</p>
          </div>
        </div>

        <HowToTabs />
      </div>
    </section>
  );
}
