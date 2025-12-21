"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import type { City, ProfileFormData } from "@/types";
import {
  embedProfile,
  embedIdea,
  createProfileEmbeddingText,
  createVentureEmbeddingText,
} from "@/lib/embeddings-client";
import { CityPicker } from "./city_selection";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: "",
    bio: "",
    achievements: "",
    experience: "",
    education: "",
    city_id: null,
    linkedinUrl: "",
    venture_title: "",
    venture_description: "",
    cofounder_preferences_title: "",
    cofounder_preferences_description: "",
  });

  const [city, setCity] = useState<City | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [message, setMessage] = useState("");
  const [linkedinUrlError, setLinkedinUrlError] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const supabase = supabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Load data from all three tables
      const [profileResult, ventureResult, preferencesResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("user_ventures")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_cofounder_preference")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      const cityId = profileResult.data?.city_id;

      // Load city data if available
      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("*")
          .eq("id", cityId)
          .maybeSingle();

        if (cityData) {
          setCity({
            id: cityData.id,
            name: cityData.name,
            admin1: cityData.admin1,
            country: cityData.country_name,
            iso2: cityData.iso2,
            label: `${cityData.name}${cityData.admin1 ? `, ${cityData.admin1}` : ""} (${cityData.country_name})`,
            population: cityData.population,
          });
        }
      }

      setProfileData({
        name: profileResult.data?.name || "",
        bio: profileResult.data?.bio || "",
        achievements: profileResult.data?.achievements || "",
        experience: profileResult.data?.experience || "",
        education: profileResult.data?.education || "",
        city_id: cityId || null,
        linkedinUrl: profileResult.data?.avatarurl || "",
        venture_title: ventureResult.data?.title || "",
        venture_description: ventureResult.data?.description || "",
        cofounder_preferences_title: preferencesResult.data?.title || "",
        cofounder_preferences_description:
          preferencesResult.data?.description || "",
      });
      setIsPublished(profileResult.data?.is_published || false);

      // If user has already saved their profile, they must have agreed to privacy policy
      if (profileResult.data) {
        setAgreedToPrivacyPolicy(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const validateLinkedInUrl = (url: string): boolean => {
    if (!url) {
      setLinkedinUrlError("LinkedIn URL is required");
      return false;
    }

    // Must match https://www.linkedin.com/in/{vanityName}
    const linkedInPattern =
      /^https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;

    if (!linkedInPattern.test(url)) {
      setLinkedinUrlError(
        "URL must be in the format: https://www.linkedin.com/in/yourprofile"
      );
      return false;
    }

    setLinkedinUrlError("");
    return true;
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Validate LinkedIn URL on change
    if (field === "linkedinUrl") {
      validateLinkedInUrl(value);
    }
  };

  const handleCityChange = (selectedCity: City | null) => {
    setCity(selectedCity);
    setProfileData((prev) => ({
      ...prev,
      city_id: selectedCity?.id || null,
    }));
  };

  const hideProfile = async () => {
    if (!user) return;

    setIsHiding(true);
    setMessage("");

    try {
      const supabase = supabaseClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_published: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) {
        setMessage("Error hiding profile: " + error.message);
      } else {
        setIsPublished(false);
        setMessage(
          "Profile hidden successfully! You will no longer appear in matches."
        );
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
      console.error("Hide profile error:", error);
    } finally {
      setIsHiding(false);
    }
  };

  const saveProfile = async (publish: boolean = false) => {
    if (!user) return;

    // Require privacy policy agreement for both saving and publishing
    if (!agreedToPrivacyPolicy) {
      setMessage("Please agree to the privacy policy before saving");
      return;
    }

    // Validate LinkedIn URL when publishing
    if (publish && !validateLinkedInUrl(profileData.linkedinUrl)) {
      setMessage("Please provide a valid LinkedIn URL before publishing");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const supabase = supabaseClient();
      const now = new Date().toISOString();

      // Prepare data for all three tables
      const profilePayload = {
        user_id: user.id,
        name: profileData.name,
        bio: profileData.bio,
        achievements: profileData.achievements,
        experience: profileData.experience,
        education: profileData.education,
        city_id: city?.id || null,
        avatarurl: profileData.linkedinUrl,
        is_published: publish,
        updated_at: now,
      };

      const venturePayload = {
        user_id: user.id,
        title: profileData.venture_title,
        description: profileData.venture_description,
        updated_at: now,
      };

      const preferencesPayload = {
        user_id: user.id,
        title: profileData.cofounder_preferences_title,
        description: profileData.cofounder_preferences_description,
        updated_at: now,
      };

      // Save to all three tables
      const [profileResult, ventureResult, preferencesResult] =
        await Promise.all([
          supabase.from("profiles").upsert(profilePayload),
          supabase.from("user_ventures").upsert(venturePayload),
          supabase.from("user_cofounder_preference").upsert(preferencesPayload),
        ]);

      // Check for errors in any of the operations
      const errors = [
        profileResult.error,
        ventureResult.error,
        preferencesResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        setMessage(
          "Error saving profile: " + errors.map((e) => e!.message).join(", ")
        );
      } else {
        // Generate embeddings only when publishing
        if (publish) {
          try {
            const embeddingPromises = [];

            // Generate venture embedding if venture data exists
            if (profileData.venture_title || profileData.venture_description) {
              const ventureText = createVentureEmbeddingText({
                title: profileData.venture_title,
                description: profileData.venture_description,
              });
              if (ventureText.trim()) {
                // Fetch the most recent venture for this user
                const { data: recentVenture } = await supabase
                  .from("user_ventures")
                  .select("id")
                  .eq("user_id", user.id)
                  .order("updated_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (recentVenture) {
                  embeddingPromises.push(
                    embedIdea(recentVenture.id, ventureText)
                  );
                }
              }
            }

            if (embeddingPromises.length > 0) {
              const embeddingResults = await Promise.all(embeddingPromises);
              const embeddingErrors = embeddingResults.filter(
                (result) => !result.success
              );

              if (embeddingErrors.length > 0) {
                const errorMessages = embeddingErrors
                  .map((e) => e.error)
                  .join(", ");
                setMessage(
                  publish
                    ? `Profile published! Embedding errors: ${errorMessages}`
                    : `Profile saved! Embedding errors: ${errorMessages}`
                );
              } else {
                if (publish) {
                  setIsPublished(true);
                  setMessage(
                    "Profile published successfully! Redirecting to matches..."
                  );
                  // Redirect to matches page after successful publish
                  setTimeout(() => {
                    router.push("/discover");
                  }, 1500);
                } else {
                  setMessage("Profile saved as draft!");
                }
              }
            } else {
              setMessage(
                publish
                  ? "Profile published successfully!"
                  : "Profile saved as draft!"
              );
            }
          } catch (embeddingError) {
            const errorMsg =
              embeddingError instanceof Error
                ? embeddingError.message
                : String(embeddingError);
            setMessage(`Profile published! Embedding error: ${errorMsg}`);
          }
        } else {
          // Draft save - no embeddings generated
          setMessage("Profile saved as draft!");
        }
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoadingProfile) {
    return (
      <LoadingSpinner currentPage="profile" user={user} onLogout={logout} />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-background)] pb-10">
      <Navigation currentPage="profile" user={user} onLogout={logout} />

      <main className="px-6 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Profile Setup"
            description="Describe yourself and what you want to build. This helps the semantic matching algorithm find compatible co-founders."
            highlight
          />

          <div className="space-y-8">
            {/* Personal Information */}
            <section className="p-6 rounded border border-gray-800">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                01. Personal Info
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                    placeholder="your name (how you want to appear to others)"
                    required
                  />
                </div>

                <div>
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    City
                  </label>
                  <CityPicker
                    defaultCity={city}
                    onChange={handleCityChange}
                    required={false}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  LinkedIn Profile URL *
                </label>
                <input
                  type="url"
                  value={profileData.linkedinUrl}
                  onChange={(e) =>
                    handleInputChange("linkedinUrl", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded font-mono text-sm focus:ring-2 focus:border-transparent outline-none bg-white ${
                    linkedinUrlError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="https://www.linkedin.com/in/yourprofile"
                  required
                />
                {linkedinUrlError && (
                  <p className="mt-1 text-xs font-mono text-red-600">
                    {linkedinUrlError}
                  </p>
                )}
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="a brief background of yourself, things you want others to know"
                />
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Personal Achievement
                </label>
                <textarea
                  value={profileData.achievements}
                  onChange={(e) =>
                    handleInputChange("achievements", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="projects, notable achievements, impressive skills you want to showcase..."
                />
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Experience
                </label>
                <textarea
                  value={profileData.experience}
                  onChange={(e) =>
                    handleInputChange("experience", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="voluntary freeform highlights of your previous work experience, roles, or companies you worked for..."
                />
              </div>

              <div className="mt-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Education
                </label>
                <textarea
                  value={profileData.education}
                  onChange={(e) =>
                    handleInputChange("education", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="voluntary freeform highlights of your educational background"
                />
              </div>
            </section>

            {/* Venture Ideas */}
            <section className="p-6 rounded border border-gray-800">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                02.Venture / Project Ideas
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                Describe what you want to build. Be specific about the problem
                you want to solve, the solution you have in mind, and your
                vision for what you will build.
                <strong>
                  This will be visible to all users who view your profile.
                </strong>{" "}
                Make sure you have the rights to disclose whatever you share
                here.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Project Tagline *
                </label>
                <input
                  type="text"
                  value={profileData.venture_title}
                  onChange={(e) =>
                    handleInputChange("venture_title", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  placeholder="e.g., a semantically-aware co-founder matching experiment"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={profileData.venture_description}
                  onChange={(e) =>
                    handleInputChange("venture_description", e.target.value)
                  }
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="e.g., a platform allowing users to find one-another based on the semantic similarity of their venture ideas"
                  required
                />
                <p className="text-xs font-mono text-gray-500 mt-1">
                  This description is used for semantic matching. Be detailed
                  and specific as this impacts the quality of your matches.
                </p>
              </div>

              <div className="mt-2 p-2 bg-gray-100 rounded border-l-3 border-blue-600">
                <p className="text-xs font-mono text-gray-700">
                  <strong>Note:</strong> When you update your idea, the matching
                  algo always considers your latest submission so new matches
                  are always based on your current idea. However, previous user
                  interactions such as existing matches will remain.
                </p>
              </div>
            </section>

            {/* Co-founder Preferences */}
            <section className="p-6 rounded border border-gray-800">
              <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
                03. Co-founder Preferences
              </h2>
              <p className="font-mono text-sm text-gray-600 mb-6">
                Describe what kind of co-founder you&apos;re looking for and
                what you bring to the table. This section has no functional
                impact and is only for display to others viewing your profiles.
                There are limited matching preferences (location filter) you can
                configure on the settings page.
              </p>

              <div className="mb-6">
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={profileData.cofounder_preferences_title}
                  onChange={(e) =>
                    handleInputChange(
                      "cofounder_preferences_title",
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  placeholder="e.g., a technical co-founder, CFO, or sales champion..."
                />
              </div>

              <div>
                <label className="block font-mono text-sm text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={profileData.cofounder_preferences_description}
                  onChange={(e) =>
                    handleInputChange(
                      "cofounder_preferences_description",
                      e.target.value
                    )
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white"
                  placeholder="anything regarding ideal skillset, experience, availability, equity expectations..."
                />
              </div>
            </section>
          </div>

          {/* Privacy Policy Agreement */}
          <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-300">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToPrivacyPolicy}
                onChange={(e) => setAgreedToPrivacyPolicy(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-mono text-sm text-gray-700">
                I have read and agree to the{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  privacy policy
                </a>
                {". *"}
              </span>
            </label>
          </div>

          {/* Save Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => saveProfile(false)}
              disabled={isSaving || !agreedToPrivacyPolicy}
              className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              onClick={() => saveProfile(true)}
              disabled={
                isSaving ||
                !agreedToPrivacyPolicy ||
                !profileData.name ||
                !profileData.linkedinUrl ||
                !!linkedinUrlError ||
                !profileData.venture_title ||
                !profileData.venture_description
              }
              className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Publishing..." : "Save & Publish"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded text-sm font-mono ${
                message.includes("Error")
                  ? "bgwhite text-red-600 border border-red-200"
                  : "bg-gwhite text-green-600 border border-green-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Hide Profile Section */}
          {isPublished && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-mono font-bold text-gray-900 mb-2">
                Profile Visibility
              </h3>
              <p className="text-sm font-mono text-gray-600 mb-4">
                Your profile is currently <strong>published</strong> and visible
                to other users. You can hide it to stop appearing in matches.
              </p>
              <button
                onClick={hideProfile}
                disabled={isHiding}
                data-testid="hide-profile-button"
                className="px-6 py-3 rounded-lg font-mono text-sm text-white bg-red-600 border border-red-600 shadow-sm transition-all duration-150 ease-out hover:bg-red-700 hover:shadow-md active:shadow-sm disabled:opawhite disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
              >
                {isHiding ? "Hiding..." : "Hide my profile"}
              </button>
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-100 rounded border-l-4 border-blue-600">
            <p className="text-sm font-mono text-gray-700">
              <strong>Note:</strong> Being upfront and honest about your
              background as well as expectations is essential and a sign that
              you respect and value the time of other users.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
