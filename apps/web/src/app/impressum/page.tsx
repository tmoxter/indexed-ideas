import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function Impressum() {
  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <Image
                src="/bulb-simple.svg"
                alt="indexed-ideas logo"
                width={26}
                height={26}
              />
              <span className="font-mono text-lg text-gray-900">
                Indexed-Ideas
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-mono font-bold text-gray-900 mb-12">
            Impressum
          </h1>
          <div className="space-y-8 font-mono text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Information according to § 5 TMG, Responsible for content
                according to § 55 Abs. 2 RStV Liability for Contents
              </h2>
              <div className="space-y-2">
                Tobias Moxter
                <br />
                Groothoffgasse 4, 22303 Hamburg, Germany
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
              <div className="space-y-2">
                data@indexed-ideas.com
                <br />
                +491741569294
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
