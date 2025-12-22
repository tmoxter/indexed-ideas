"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabase";
import TypewriterHero from "@/components/TypewriterHero";
import Footer from "@/components/Footer";
import FAQ, { type FAQItem } from "@/components/FAQ";
import MagneticLoginButton from "@/components/MagneticLoginButton";
import SectionHeader from "@/components/SectionHeader";
import FeatureCard from "@/components/FeatureCard";
import LandingPageImage from "@/components/LandingPageImage";
import { ArrowUpZA, Feather, SwatchBook, Telescope } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = supabaseClient();
  const { data: bulbImageData } = supabase.storage
    .from("internal_display_media")
    .getPublicUrl("bulb-static.png");

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "/home";
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const faqItems: FAQItem[] = [
    {
      question: "Aren't there already alternative platforms out there?",
      answer: `The goal is to offer a better signal-to-noise ratio and shift the focus from users' backgrounds to their work.
        While all platforms let you describe what you are working on, search filters are limited to broad categories.
        Selecting areas of interest such as 'Biotech' or 'Finance' (e.g. on YC) leaves a vast landscape of unrelated endevours.
        As a consequence, you get many potential co-founders but few that understand what you do. The person you should be building
        with may easily drown in the noise of loosely related profiles.
        <br/><br/>
        Convincing potential co-founders of your vision makes for great sales practice but in-efficient search.`,
    },
    {
      question: "Won't other users 'steal' my venture ideas?",
      answer: `Sharing your idea here means making it publically visible. Experienced founders frequently state that
        secrecy around their prospective ventures is rarely justified and Indexed-Ideas is built around this mantra.
        Of-course there are exceptions.
        Please don't share any sensitive information or details that you wish to disclose only selectively.
        If you delete your account all your data is wiped permanently.
        <br/><br/>
        One quote in the spirit of openess from serial entrepreneur Naval Ravikant: 'You can always recognize the first-timers because they're too secretive. And
        you can always recognize the experienced ones because they don't care.'`,
    },
    {
      question: "How do you define whether an idea is 'similar'?",
      answer: `There are 4 different levels for you to configure that serve as a threshold for how related ideas have to be to count as 'similar'.
        The levels are heuristics derived from experimentation, please offer feedback if you are shown dissimilar profiles.`,
    },
    {
      question: "Can I not just log-in via e-mail?",
      answer: `Since little info needs to be shared here and profiles are unvetted,
        it makes sense to aim for rich profile provenance and using third-party providers with authenticity.
        LinkedIn is an obvious choice but it doesn't need to be the only option in the long run. For now it is.
        Indexed-Ideas only requests the minimal authentication data but <strong>no</strong> profile data such as employment history.`,
    },
  ];

  const features = [
    {
      icon: ArrowUpZA,
      title: "Semantic Similarity",
      description: `Users describe their venture or project ideas in detail.
        Finding potential matches is then achieved by indexing the semantic embeddings of users' venture ideas and matching the most similar candidates.`,
    },
    {
      icon: Feather,
      title: "Lightweight",
      description: `Indexed-Ideas is lightweight in that it requires little set-up or commitment.
        You share your name and as much or little about yourself as you wish: The focus lies on what you are working on.`,
    },
    {
      icon: SwatchBook,
      title: "Minimal",
      description: `Indexed-Ideas is minimal in that it aims not to re-create what already works. For example, there is no chat feature. If you match, you share your LinkedIn<sup>*</sup> profiles to connect.
        <br/><br/>
        <small>* No affiliation</small>`,
    },
    {
      icon: Telescope,
      title: "Insights",
      description: `Aggregates of how many out there are tackling similar problems. Insights to help you size up your ecosystem.
      Hopefully soon, if users disclose abandoned ideas: An answer to the question "Am I working on a tarpit ideas?".`,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10 relative">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 relative z-20">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  window.location.href = "/discover";
                } else {
                  window.location.reload();
                }
              }}
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
            </button>
          </div>
        </nav>
      </header>

      {/* Background image - sits above gradient background, below content */}
      <LandingPageImage
        src={bulbImageData.publicUrl}
        alt="Light bulb decoration"
        width={350}
        height={300}
        top="40px"
        right="7%"
        opacity={0.6}
        mobileOpacity={0.15}
        zIndex={1}
      />

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-start gap-8 mb-12">
              <div className="flex-1 max-w-5xl relative z-10">
                <TypewriterHero />
                <p className="text-xl text-gray-900 mb-8 leading-relaxed font-mono relative z-10">
                  Indexed-Ideas is a lightweight, minimal, and free co-founder
                  matchig platform. It serves a single purpose: finding
                  collaborators, who are working on the same problems as you.
                </p>
              </div>
            </div>

            {/* Content Section - How it works + Sign Up Form */}
            <div className="flex flex-col lg:flex-row gap-8 mb-12 py-5">
              {/* How it works */}
              <div className="flex-1">
                <SectionHeader title="How it works" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {features.map((feature, index) => (
                    <FeatureCard
                      key={index}
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                    />
                  ))}
                </div>
              </div>

              {/* Sign Up / Login Form */}
              <div className="lg:w-96 min-h-[400px] flex items-center justify-center">
                <MagneticLoginButton />
              </div>
            </div>

            {/* Technical Note */}
            <div className="max-w-5xl">
              <SectionHeader title="Free and Open" />
              <div className="mt-6 rounded mb-10">
                <p className="text-m font-mono text-gray-900">
                  Indexed-Ideas is a side project. It does not generate any
                  profits, e.g., by showing you adds. With the current
                  affordability of embedding tokens, you do not have to bring
                  your own API keys, so it is completely free to use. It remains
                  in an experimental state, so if you find any bugs or have
                  suggestions, please open an issue or a PR on GitHub.
                  <a
                    href={process.env.NEXT_PUBLIC_GITHUB_REPO_URL}
                    className="text-gray-900 hover:underline ml-1"
                  >
                    <strong>View source on GH →</strong>
                  </a>
                </p>
              </div>

              {/* FAQ Section */}
              <SectionHeader title="FAQ" />
              <FAQ items={faqItems} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
