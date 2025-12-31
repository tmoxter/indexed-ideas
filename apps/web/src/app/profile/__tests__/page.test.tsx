import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initializeMockData, resetMockData } from "@/test/mocks/supabase";

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: "/profile",
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock embeddings client functions
const mockEmbedProfile = vi.fn();
const mockEmbedIdea = vi.fn();

vi.mock("@/lib/embeddings-client", () => ({
  embedProfile: mockEmbedProfile,
  embedIdea: mockEmbedIdea,
  createProfileEmbeddingText: (profile: {
    name?: string;
    bio?: string;
    achievements?: string;
    region?: string;
  }) => {
    const parts = [
      profile.name && `Name: ${profile.name}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.achievements && `Experience: ${profile.achievements}`,
      profile.region && `Location: ${profile.region}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  },
  createVentureEmbeddingText: (venture: {
    title?: string;
    description?: string;
  }) => {
    const parts = [
      venture.title && `Project: ${venture.title}`,
      venture.description && `Description: ${venture.description}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  },
}));

// Mock CityPicker component
vi.mock("../city_selection", () => ({
  CityPicker: ({
    defaultCity,
  }: {
    onChange?: (city: { id: number; name: string } | null) => void;
    defaultCity?: { id: number; name: string } | null;
  }) => (
    <div data-testid="city-picker">City: {defaultCity?.name || "None"}</div>
  ),
}));

// Import the component after all mocks are set up
const ProfilePage = await import("../page").then((m) => m.default);

describe("ProfilePage Integration Tests", () => {
  const testUserId = "test-user-123";
  const testUserEmail = "test@example.com";

  // Track database state
  let mockProfilesDb: Array<Record<string, unknown>> = [];
  let mockVenturesDb: Array<Record<string, unknown>> = [];
  let mockPreferencesDb: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockData();
    initializeMockData();
    mockPush.mockClear();
    mockEmbedProfile.mockClear();
    mockEmbedIdea.mockClear();

    // Reset database state
    mockProfilesDb = [];
    mockVenturesDb = [];
    mockPreferencesDb = [];

    // Mock embeddings to return success
    mockEmbedProfile.mockResolvedValue({ success: true });
    mockEmbedIdea.mockResolvedValue({ success: true });

    // Create a mock Supabase client with database state tracking
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        let selectedFields: string | undefined;

        const queryBuilder = {
          select: vi.fn().mockImplementation((fields?: string) => {
            selectedFields = fields;
            return queryBuilder;
          }),
          insert: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        };

        // Handle different table operations
        if (table === "profiles") {
          queryBuilder.single.mockImplementation(() => {
            const profile = mockProfilesDb.find(
              (p) => p.user_id === testUserId
            );

            const fieldsToReturn = selectedFields;
            selectedFields = undefined;

            if (profile) {
              // If specific fields were requested, filter to those fields
              // but include the field even if it's undefined
              if (fieldsToReturn) {
                const fields = fieldsToReturn.split(",").map((f) => f.trim());
                const data: Record<string, unknown> = {};
                fields.forEach((field) => {
                  data[field] = profile[field];
                });
                return Promise.resolve({ data, error: null });
              }
              return Promise.resolve({ data: profile, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const profile = mockProfilesDb.find(
              (p) => p.user_id === testUserId
            );

            const fieldsToReturn = selectedFields;
            selectedFields = undefined;

            if (profile) {
              // If specific fields were requested (but not "*"), filter to those fields
              if (fieldsToReturn && fieldsToReturn !== "*") {
                const fields = fieldsToReturn.split(",").map((f) => f.trim());
                const data: Record<string, unknown> = {};
                fields.forEach((field) => {
                  data[field] = profile[field];
                });
                return Promise.resolve({ data, error: null });
              }
            }
            return Promise.resolve({ data: profile || null, error: null });
          });

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              const existingIndex = mockProfilesDb.findIndex(
                (p) => p.user_id === data.user_id
              );
              if (existingIndex >= 0) {
                mockProfilesDb[existingIndex] = {
                  ...mockProfilesDb[existingIndex],
                  ...data,
                };
              } else {
                mockProfilesDb.push(data);
              }
              return Promise.resolve({ data, error: null });
            }
          );
        }

        if (table === "user_ventures") {
          queryBuilder.single.mockImplementation(() => {
            const venture = mockVenturesDb.find(
              (v) => v.user_id === testUserId
            );
            if (venture) {
              return Promise.resolve({ data: venture, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const venture = mockVenturesDb.find(
              (v) => v.user_id === testUserId
            );
            return Promise.resolve({ data: venture || null, error: null });
          });

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              const existingIndex = mockVenturesDb.findIndex(
                (v) => v.user_id === data.user_id
              );
              if (existingIndex >= 0) {
                mockVenturesDb[existingIndex] = {
                  ...mockVenturesDb[existingIndex],
                  ...data,
                };
              } else {
                const newVenture = { ...data, id: `venture-${Date.now()}` };
                mockVenturesDb.push(newVenture);
              }
              return Promise.resolve({ data, error: null });
            }
          );
        }

        if (table === "user_cofounder_preference") {
          queryBuilder.single.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            if (pref) {
              return Promise.resolve({ data: pref, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            return Promise.resolve({ data: pref || null, error: null });
          });

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              const existingIndex = mockPreferencesDb.findIndex(
                (p) => p.user_id === data.user_id
              );
              if (existingIndex >= 0) {
                mockPreferencesDb[existingIndex] = {
                  ...mockPreferencesDb[existingIndex],
                  ...data,
                };
              } else {
                mockPreferencesDb.push(data);
              }
              return Promise.resolve({ data, error: null });
            }
          );
        }

        // Handle cities table for city lookups
        if (table === "cities") {
          queryBuilder.maybeSingle.mockImplementation(() => {
            // For test purposes, return a mock city if needed
            return Promise.resolve({ data: null, error: null });
          });
        }

        return queryBuilder;
      }),
    };

    mockSupabaseClient.mockReturnValue(mockClient);
  });

  it("should render loading state initially", () => {
    render(<ProfilePage />);
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should load and display empty form for new user", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Check that form is rendered with empty fields
    expect(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      )
    ).toHaveValue("");
    expect(screen.getByTestId("city-picker")).toBeInTheDocument();
  });

  it("should load existing profile data", async () => {
    // Pre-populate database with existing data
    mockProfilesDb = [
      {
        user_id: testUserId,
        name: "John Doe",
        bio: "Software engineer with 10 years experience",
        achievements: "Built 3 successful startups",
        region: "San Francisco, CA",
        is_published: false,
      },
    ];

    mockVenturesDb = [
      {
        id: "venture-1",
        user_id: testUserId,
        title: "AI Code Assistant",
        description: "Building an AI-powered coding tool",
      },
    ];

    mockPreferencesDb = [
      {
        user_id: testUserId,
        title: "Technical Co-founder",
        description: "Looking for someone with ML experience",
      },
    ];

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Wait for profile data to be loaded into form fields
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Check that existing data is loaded
    expect(
      screen.getByDisplayValue("Software engineer with 10 years experience")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI Code Assistant")).toBeInTheDocument();
  });

  it("should save profile as draft without generating embeddings", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in form fields
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "A comprehensive development toolkit for modern teams"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    // Click save as draft
    const saveDraftButton = screen.getByRole("button", {
      name: /save as draft/i,
    });
    await user.click(saveDraftButton);

    // Wait for save confirmation
    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify data was written to all three tables
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0]).toMatchObject({
      user_id: testUserId,
      name: "Jane Smith",
      is_published: false,
    });

    expect(mockVenturesDb).toHaveLength(1);
    expect(mockVenturesDb[0]).toMatchObject({
      user_id: testUserId,
      title: "DevTools Pro",
      description: "A comprehensive development toolkit for modern teams",
    });

    // Embeddings should not be generated for draft
    expect(mockEmbedProfile).not.toHaveBeenCalled();
    expect(mockEmbedIdea).not.toHaveBeenCalled();
  });

  it("should publish profile and generate embeddings", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      ),
      "https://www.linkedin.com/in/janesmith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /Say hello and share a little bit about yourself.../i
      ),
      "Experienced product manager"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "A comprehensive development toolkit for modern teams"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    // Click publish
    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });
    await user.click(publishButton);

    // Wait for publish confirmation
    await waitFor(() => {
      expect(
        screen.getByText(/profile published successfully/i)
      ).toBeInTheDocument();
    });

    // Verify data was written with is_published = true
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0]).toMatchObject({
      user_id: testUserId,
      name: "Jane Smith",
      bio: "Experienced product manager",
      is_published: true,
      // Note: city_id is now used instead of region
    });

    expect(mockVenturesDb).toHaveLength(1);
    expect(mockVenturesDb[0]).toMatchObject({
      user_id: testUserId,
      title: "DevTools Pro",
    });

    // Embeddings should be generated
    expect(mockEmbedIdea).toHaveBeenCalled();

    // Should redirect to discover page after publish
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/discover");
      },
      { timeout: 2000 }
    );
  });

  it("should disable publish button when required fields are missing", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });

    // Should be disabled initially
    expect(publishButton).toBeDisabled();
  });

  it("should enable publish button when all required fields are filled", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });
    expect(publishButton).toBeDisabled();

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      ),
      "https://www.linkedin.com/in/janesmith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "A toolkit for developers"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    // Should now be enabled
    await waitFor(() => {
      expect(publishButton).not.toBeDisabled();
    });
  });

  it("should update existing profile data", async () => {
    // Pre-populate with existing data
    mockProfilesDb = [
      {
        user_id: testUserId,
        name: "John Doe",
        bio: "Old bio",
        region: "SF",
        is_published: false,
      },
    ];

    mockVenturesDb = [
      {
        id: "venture-1",
        user_id: testUserId,
        title: "Old Title",
        description: "Old description",
      },
    ];

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Update the name
    const nameInput = screen.getByDisplayValue("John Doe");
    await user.clear(nameInput);
    await user.type(nameInput, "John Updated");

    // Save draft
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify data was updated (upserted)
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0].name).toBe("John Updated");
  });

  it("should handle save errors gracefully", async () => {
    // Mock an error in the upsert operation
    const mockClient = mockSupabaseClient();
    mockClient.from = vi.fn().mockImplementation((table: string) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };

      if (table === "profiles") {
        queryBuilder.upsert = vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        });
      }

      return queryBuilder;
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "DevTools"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "A toolkit"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    // Try to save
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error saving profile/i)).toBeInTheDocument();
    });
  });

  it("should redirect to home when not authenticated", async () => {
    // Mock unauthenticated state
    const mockClient = mockSupabaseClient();
    mockClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("should save all form fields correctly", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in all fields
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Alice Johnson"
    );
    await user.type(
      screen.getByPlaceholderText(
        /say hello and share a little bit about yourself.../i
      ),
      "Full-stack developer with AI expertise"
    );
    await user.type(
      screen.getByPlaceholderText(
        /projects, notable achievements, impressive skills you want to showcase/i
      ),
      "Ex-Google, built ML platform"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "CodeReview AI"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "Automated code review using machine learning"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a technical co-founder, CFO, or sales champion/i
      ),
      "Technical Co-founder Needed"
    );
    await user.type(
      screen.getByPlaceholderText(
        /anything regarding ideal skillset, experience, availability, equity expectations/i
      ),
      "Looking for backend engineer with ML experience"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    // Save as draft
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify all data was saved correctly
    expect(mockProfilesDb[0]).toMatchObject({
      name: "Alice Johnson",
      bio: "Full-stack developer with AI expertise",
      achievements: "Ex-Google, built ML platform",
      // Note: city_id is now used instead of region
    });

    expect(mockVenturesDb[0]).toMatchObject({
      title: "CodeReview AI",
      description: "Automated code review using machine learning",
    });

    expect(mockPreferencesDb[0]).toMatchObject({
      title: "Technical Co-founder Needed",
      description: "Looking for backend engineer with ML experience",
    });
  });

  it("should handle embedding generation errors without blocking save", async () => {
    // Mock embedding functions to return errors
    mockEmbedProfile.mockResolvedValue({
      success: false,
      error: "OpenAI API error",
    });
    mockEmbedIdea.mockResolvedValue({
      success: false,
      error: "OpenAI API error",
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill and publish
    await user.type(
      screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      ),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      ),
      "https://www.linkedin.com/in/janesmith"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      ),
      "DevTools"
    );
    await user.type(
      screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      ),
      "A toolkit"
    );

    // Agree to privacy policy
    const privacyCheckbox = screen.getByRole("checkbox", {
      name: /privacy policy/i,
    });
    await user.click(privacyCheckbox);

    await user.click(screen.getByRole("button", { name: /save & publish/i }));

    // Should show success with embedding error noted
    await waitFor(() => {
      expect(screen.getByText(/embedding error/i)).toBeInTheDocument();
    });

    // Data should still be saved
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockVenturesDb).toHaveLength(1);
  });

  describe("LinkedIn URL Validation", () => {
    it("should accept valid LinkedIn URLs", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test valid URL
      await user.type(linkedinInput, "https://www.linkedin.com/in/johndoe");

      // Should not show error
      expect(
        screen.queryByText(/url must be in the format/i)
      ).not.toBeInTheDocument();
    });

    it("should accept valid LinkedIn URLs with hyphens and trailing slash", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL with hyphens and trailing slash
      await user.type(
        linkedinInput,
        "https://www.linkedin.com/in/john-doe-123/"
      );

      // Should not show error
      expect(
        screen.queryByText(/url must be in the format/i)
      ).not.toBeInTheDocument();
    });

    it("should reject LinkedIn URLs with wrong domain", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test invalid domain
      await user.type(linkedinInput, "https://linkedin.co.uk/in/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject LinkedIn URLs without https", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL without https
      await user.type(linkedinInput, "http://www.linkedin.com/in/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject non-LinkedIn URLs", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test completely different URL
      await user.type(linkedinInput, "https://www.facebook.com/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject LinkedIn URLs with wrong path", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL with company path instead of /in/
      await user.type(
        linkedinInput,
        "https://www.linkedin.com/company/johndoe"
      );

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should disable publish button when LinkedIn URL is invalid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields except valid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "https://facebook.com/jane"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit for developers"
      );

      // Publish button should be disabled due to invalid LinkedIn URL
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      await waitFor(() => {
        expect(publishButton).toBeDisabled();
      });
    });

    it("should disable publish button when LinkedIn URL is empty", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields except LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit for developers"
      );

      // Publish button should be disabled without LinkedIn URL
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      expect(publishButton).toBeDisabled();
    });

    it("should enable publish button when LinkedIn URL is valid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields with valid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "https://www.linkedin.com/in/janesmith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit for developers"
      );

      // Agree to privacy policy
      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      // Publish button should be enabled
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      await waitFor(() => {
        expect(publishButton).not.toBeDisabled();
      });
    });

    it("should save LinkedIn URL to avatarurl field", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinUrl = "https://www.linkedin.com/in/janesmith";

      // Fill in required fields
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        linkedinUrl
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A comprehensive development toolkit"
      );

      // Agree to privacy policy
      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      // Save as draft
      await user.click(screen.getByRole("button", { name: /save as draft/i }));

      await waitFor(() => {
        expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
      });

      // Verify LinkedIn URL was saved to avatarurl field
      expect(mockProfilesDb).toHaveLength(1);
      expect(mockProfilesDb[0]).toMatchObject({
        user_id: testUserId,
        name: "Jane Smith",
        avatarurl: linkedinUrl,
      });
    });

    it("should load LinkedIn URL from avatarurl field", async () => {
      // Pre-populate database with LinkedIn URL in avatarurl
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: false,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Wait for profile data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      });

      // Verify LinkedIn URL is loaded
      expect(
        screen.getByDisplayValue("https://www.linkedin.com/in/johndoe")
      ).toBeInTheDocument();
    });

    it("should prevent publishing with validation error message when LinkedIn URL is invalid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all fields with invalid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "invalid-url"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit"
      );

      // Try to publish (button should be disabled, but test the validation logic)
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });

      // Button should be disabled
      expect(publishButton).toBeDisabled();

      // Error message should be visible
      expect(
        screen.getByText(/url must be in the format/i)
      ).toBeInTheDocument();
    });
  });

  describe("Hide Profile Functionality", () => {
    it("should show hide profile button when profile is published", async () => {
      // Pre-populate with published profile
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          bio: "Test bio",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: true,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      mockPreferencesDb = [
        {
          user_id: testUserId,
          title: "Test",
          description: "Test preferences",
        },
      ];

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Hide profile button should be visible
      await waitFor(() => {
        expect(screen.getByTestId("hide-profile-button")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/your profile is currently/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/published/i)).toBeInTheDocument();
    });

    it("should not show hide profile button when profile is not published", async () => {
      // Pre-populate with unpublished profile
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          bio: "Test bio",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: false,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Hide profile button should not be visible
      await waitFor(() => {
        expect(
          screen.queryByTestId("hide-profile-button")
        ).not.toBeInTheDocument();
      });
    });

    it("should hide profile when hide button is clicked", async () => {
      // Pre-populate with published profile
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          bio: "Test bio",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: true,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      mockPreferencesDb = [
        {
          user_id: testUserId,
          title: "Test",
          description: "Test preferences",
        },
      ];

      // Create mock client with update functionality
      const mockClient = mockSupabaseClient();
      mockClient.from = vi.fn().mockImplementation((table: string) => {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        };

        if (table === "profiles") {
          queryBuilder.single.mockImplementation(() => {
            const profile = mockProfilesDb.find(
              (p) => p.user_id === testUserId
            );
            if (profile) {
              return Promise.resolve({ data: profile, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const profile = mockProfilesDb.find(
              (p) => p.user_id === testUserId
            );
            return Promise.resolve({ data: profile || null, error: null });
          });

          queryBuilder.update.mockImplementation(
            (data: Record<string, unknown>) => {
              return {
                eq: vi
                  .fn()
                  .mockImplementation((field: string, value: unknown) => {
                    const profileIndex = mockProfilesDb.findIndex(
                      (p) => p.user_id === value
                    );
                    if (profileIndex >= 0) {
                      mockProfilesDb[profileIndex] = {
                        ...mockProfilesDb[profileIndex],
                        ...data,
                      };
                    }
                    return Promise.resolve({ data, error: null });
                  }),
              };
            }
          );

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              const existingIndex = mockProfilesDb.findIndex(
                (p) => p.user_id === data.user_id
              );
              if (existingIndex >= 0) {
                mockProfilesDb[existingIndex] = {
                  ...mockProfilesDb[existingIndex],
                  ...data,
                };
              } else {
                mockProfilesDb.push(data);
              }
              return Promise.resolve({ data, error: null });
            }
          );
        }

        if (table === "user_ventures") {
          queryBuilder.single.mockImplementation(() => {
            const venture = mockVenturesDb.find(
              (v) => v.user_id === testUserId
            );
            return Promise.resolve({ data: venture, error: null });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const venture = mockVenturesDb.find(
              (v) => v.user_id === testUserId
            );
            return Promise.resolve({ data: venture || null, error: null });
          });

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              return Promise.resolve({ data, error: null });
            }
          );
        }

        if (
          table === "user_cofounder_preference" ||
          table === "user_cofounder_preference"
        ) {
          queryBuilder.single.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            return Promise.resolve({ data: pref, error: null });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            return Promise.resolve({ data: pref || null, error: null });
          });

          queryBuilder.upsert.mockImplementation(
            (data: Record<string, unknown>) => {
              return Promise.resolve({ data, error: null });
            }
          );
        }

        // Handle cities table
        if (table === "cities") {
          queryBuilder.maybeSingle.mockImplementation(() => {
            return Promise.resolve({ data: null, error: null });
          });
        }

        return queryBuilder;
      });

      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Wait for hide button to appear
      await waitFor(() => {
        expect(screen.getByTestId("hide-profile-button")).toBeInTheDocument();
      });

      // Verify profile is published
      expect(mockProfilesDb[0].is_published).toBe(true);

      // Click hide button
      await user.click(screen.getByTestId("hide-profile-button"));

      // Wait for success message
      await waitFor(() => {
        expect(
          screen.getByText(/profile hidden successfully/i)
        ).toBeInTheDocument();
      });

      // Verify is_published was set to false
      expect(mockProfilesDb[0].is_published).toBe(false);

      // Hide button should disappear
      await waitFor(() => {
        expect(
          screen.queryByTestId("hide-profile-button")
        ).not.toBeInTheDocument();
      });
    });

    it("should handle hide profile errors gracefully", async () => {
      // Pre-populate with published profile
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          bio: "Test bio",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: true,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      mockPreferencesDb = [
        {
          user_id: testUserId,
          title: "Test",
          description: "Test preferences",
        },
      ];

      // Mock client with update error
      const mockClient = mockSupabaseClient();
      mockClient.from = vi.fn().mockImplementation((table: string) => {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
          upsert: vi.fn(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        };

        if (table === "profiles") {
          queryBuilder.single.mockImplementation(() => {
            const profile = mockProfilesDb[0];
            return Promise.resolve({ data: profile, error: null });
          });

          queryBuilder.maybeSingle.mockImplementation(() => {
            const profile = mockProfilesDb[0];
            return Promise.resolve({ data: profile || null, error: null });
          });

          queryBuilder.update.mockImplementation(() => {
            return {
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            };
          });

          queryBuilder.upsert.mockResolvedValue({ data: {}, error: null });
        }

        if (table === "user_ventures") {
          queryBuilder.single.mockResolvedValue({
            data: mockVenturesDb[0],
            error: null,
          });
          queryBuilder.maybeSingle.mockResolvedValue({
            data: mockVenturesDb[0] || null,
            error: null,
          });
          queryBuilder.upsert.mockResolvedValue({ data: {}, error: null });
        }

        if (
          table === "user_cofounder_preference" ||
          table === "user_cofounder_preference"
        ) {
          queryBuilder.single.mockResolvedValue({
            data: mockPreferencesDb[0],
            error: null,
          });
          queryBuilder.maybeSingle.mockResolvedValue({
            data: mockPreferencesDb[0] || null,
            error: null,
          });
          queryBuilder.upsert.mockResolvedValue({ data: {}, error: null });
        }

        // Handle cities table
        if (table === "cities") {
          queryBuilder.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
          });
        }

        return queryBuilder;
      });

      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Wait for hide button
      await waitFor(() => {
        expect(screen.getByTestId("hide-profile-button")).toBeInTheDocument();
      });

      // Click hide button
      await user.click(screen.getByTestId("hide-profile-button"));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error hiding profile/i)).toBeInTheDocument();
      });
    });
  });

  describe("Character Limits", () => {
    it("should display character counter for name field", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const counters100 = screen.getAllByText("0/100");
      expect(counters100.length).toBeGreaterThan(0);
    });

    it("should update character counter as user types in name field", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      );

      await user.type(nameInput, "John Doe");

      await waitFor(() => {
        expect(screen.getByText("8/100")).toBeInTheDocument();
      });
    });

    it("should display character counter for venture description with 1000 limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      expect(screen.getByText("0/1000")).toBeInTheDocument();

      const descriptionInput = screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      );

      await user.type(descriptionInput, "Test description");

      await waitFor(() => {
        expect(screen.getByText("16/1000")).toBeInTheDocument();
      });
    });

    it("should display character counter for bio field with 500 limit", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Bio, achievements, and cofounder_preferences_description all have 500 limit
      const counters500 = screen.getAllByText("0/500");
      expect(counters500.length).toBeGreaterThan(0);
    });

    it("should disable save button when name exceeds 100 character limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      );

      const longName = "a".repeat(101);
      await user.type(nameInput, longName);

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      await waitFor(() => {
        expect(saveDraftButton).toBeDisabled();
      });

      expect(screen.getByText("101/100")).toBeInTheDocument();
    });

    it("should disable publish button when venture description exceeds 1000 character limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "https://www.linkedin.com/in/janesmith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );

      const longDescription = "a".repeat(1001);
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        longDescription
      );

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      await waitFor(() => {
        expect(publishButton).toBeDisabled();
      });

      expect(screen.getByText("1001/1000")).toBeInTheDocument();
    });

    it("should disable buttons when bio exceeds 500 character limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "https://www.linkedin.com/in/janesmith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit"
      );

      const longBio = "a".repeat(501);
      await user.type(
        screen.getByPlaceholderText(
          /say hello and share a little bit about yourself.../i
        ),
        longBio
      );

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });

      await waitFor(() => {
        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });

      expect(screen.getByText("501/500")).toBeInTheDocument();
    });

    it("should show character counter for LinkedIn URL field with 200 limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedInInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      expect(screen.getAllByText("0/200")).toBeTruthy();

      // Type a LinkedIn URL
      await user.type(linkedInInput, "https://www.linkedin.com/in/janesmith");

      await waitFor(() => {
        const counters = screen.queryAllByText(/\d+\/200/);
        expect(counters.length).toBeGreaterThan(0);
      });
    });

    it("should enable buttons when all fields are within character limits", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      );
      const linkedInInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );
      const bioInput = screen.getByPlaceholderText(
        /say hello and share a little bit about yourself.../i
      );
      const ventureTitleInput = screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      );
      const ventureDescInput = screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      );

      // Use paste for large text inputs to avoid timeout
      await user.click(nameInput);
      await user.paste("a".repeat(100));

      await user.click(linkedInInput);
      await user.paste("https://www.linkedin.com/in/janesmith");

      await user.click(bioInput);
      await user.paste("a".repeat(500));

      await user.click(ventureTitleInput);
      await user.paste("a".repeat(200)); 

      await user.click(ventureDescInput);
      await user.paste("a".repeat(1000));

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });

      await waitFor(() => {
        expect(saveDraftButton).not.toBeDisabled();
        expect(publishButton).not.toBeDisabled();
      });
    });

    it("should allow saving when exactly at character limit", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      );
      const linkedInInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );
      const ventureTitleInput = screen.getByPlaceholderText(
        /e.g., a semantically-aware co-founder matching experiment/i
      );
      const ventureDescInput = screen.getByPlaceholderText(
        /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
      );

      // Use paste for large text inputs to avoid timeout
      await user.click(nameInput);
      await user.paste("a".repeat(100));

      await user.click(linkedInInput);
      await user.paste("https://www.linkedin.com/in/janesmith");

      await user.click(ventureTitleInput);
      await user.paste("a".repeat(200));

      await user.click(ventureDescInput);
      await user.paste("a".repeat(1000));

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      await user.click(saveDraftButton);

      await waitFor(() => {
        expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
      });

      // Verify data was saved
      expect(mockProfilesDb).toHaveLength(1);
      expect(mockProfilesDb[0].name).toHaveLength(100);
    });

    it("should update character limit error state when user corrects field", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(
        "your name (how you want to appear to others)"
      );

      await user.type(nameInput, "a".repeat(101));

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      // Save button should be disabled
      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      await waitFor(() => {
        expect(saveDraftButton).toBeDisabled();
      });

      await user.clear(nameInput);
      await user.type(nameInput, "Jane Smith");

      await waitFor(() => {
        expect(saveDraftButton).not.toBeDisabled();
      });
    });

    it("should display multiple character counters for different fields", async () => {
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Check that multiple counters are displayed
      const counters100 = screen.getAllByText("0/100"); // Name and cofounder_preferences_title fields
      const counters200 = screen.getAllByText("0/200"); // Multiple 200-limit fields (experience, education, linkedinUrl, venture_title)
      const counters500 = screen.getAllByText("0/500"); // Bio, achievements, cofounder_preferences_description
      const counters1000 = screen.getAllByText("0/1000"); // Venture description

      expect(counters100.length).toBeGreaterThan(0);
      expect(counters200.length).toBeGreaterThan(0);
      expect(counters500.length).toBeGreaterThan(0);
      expect(counters1000.length).toBeGreaterThan(0);
    });

    it("should prevent saving when multiple fields exceed limits", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Exceed limits on multiple fields
      await user.type(
        screen.getByPlaceholderText(
          "your name (how you want to appear to others)"
        ),
        "a".repeat(101)
      );
      await user.type(
        screen.getByPlaceholderText(
          /say hello and share a little bit about yourself.../i
        ),
        "a".repeat(501)
      );
      await user.type(
        screen.getByPlaceholderText(
          /https:\/\/www.linkedin.com\/in\/yourprofile/i
        ),
        "https://www.linkedin.com/in/janesmith"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a semantically-aware co-founder matching experiment/i
        ),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(
          /e.g., a platform allowing users to find co-founders based on the semantic similarity of their venture ideas/i
        ),
        "A toolkit"
      );

      const privacyCheckbox = screen.getByRole("checkbox", {
        name: /privacy policy/i,
      });
      await user.click(privacyCheckbox);

      // Both buttons should be disabled
      const saveDraftButton = screen.getByRole("button", {
        name: /save as draft/i,
      });
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });

      await waitFor(() => {
        expect(saveDraftButton).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });
    });
  });
});
