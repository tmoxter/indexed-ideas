import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navigation from "../Navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseMaybeSingle = vi.fn();
const mockSupabaseGetSession = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseClient: () => ({
    from: mockSupabaseFrom,
    auth: {
      getSession: mockSupabaseGetSession,
    },
  }),
}));

// Mock MobileMenu
vi.mock("../MobileMenu", () => ({
  default: ({ userName, isLoadingUserName, user }: any) => (
    <div data-testid="mobile-menu">
      {user &&
        !isLoadingUserName &&
        (userName ? (
          <span data-testid="mobile-user-name">{userName}</span>
        ) : (
          <button data-testid="mobile-create-profile">Create a Profile</button>
        ))}
    </div>
  ),
}));

describe("Navigation", () => {
  const testUser: SupabaseUser = {
    id: "test-user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();

    // Default mock for getSession
    mockSupabaseGetSession.mockResolvedValue({
      data: { session: { user: testUser } },
      error: null,
    });
  });

  describe("User name display - loading states", () => {
    it("should not display user name or 'Create a Profile' while loading", async () => {
      // Set up a promise that won't resolve immediately to simulate loading
      let resolveProfileQuery: (value: any) => void;
      const profileQueryPromise = new Promise((resolve) => {
        resolveProfileQuery = resolve;
      });

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(profileQueryPromise),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      // During loading, neither user name nor "Create a Profile" should be visible
      expect(screen.queryByText(/test-user/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/create a profile/i)).not.toBeInTheDocument();

      // Resolve the query
      resolveProfileQuery!({ data: { name: "Test User" }, error: null });

      // After loading, user name should be visible
      await waitFor(() => {
        const userNames = screen.getAllByText("Test User");
        expect(userNames.length).toBeGreaterThan(0);
      });
    });

    it("should display user name when loaded and user has a name", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: "John Doe" },
              error: null,
            }),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      await waitFor(() => {
        const userNames = screen.getAllByText("John Doe");
        expect(userNames.length).toBeGreaterThan(0);
      });

      // "Create a Profile" should not be shown
      expect(screen.queryByText(/create a profile/i)).not.toBeInTheDocument();
    });

    it("should display 'Create a Profile' button when loaded and user has no name", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      await waitFor(() => {
        const createProfileButtons = screen.getAllByText(/create a profile/i);
        expect(createProfileButtons.length).toBeGreaterThan(0);
      });
    });

    it("should display 'Create a Profile' button when profile name is empty string", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: "" },
              error: null,
            }),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      await waitFor(() => {
        const createProfileButtons = screen.getAllByText(/create a profile/i);
        expect(createProfileButtons.length).toBeGreaterThan(0);
      });
    });

    it("should navigate to profile page when 'Create a Profile' is clicked", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const user = userEvent.setup();
      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/create a profile/i).length).toBeGreaterThan(
          0
        );
      });

      const createProfileButton = screen.getAllByText(/create a profile/i)[0];
      await user.click(createProfileButton);

      expect(mockPush).toHaveBeenCalledWith("/profile");
    });

    it("should handle profile fetch error gracefully", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      // Should show "Create a Profile" when there's an error
      await waitFor(() => {
        const createProfileButtons = screen.getAllByText(/create a profile/i);
        expect(createProfileButtons.length).toBeGreaterThan(0);
      });
    });

    it("should pass loading state to MobileMenu correctly", async () => {
      // Delay the profile query to test loading state
      let resolveProfileQuery: (value: any) => void;
      const profileQueryPromise = new Promise((resolve) => {
        resolveProfileQuery = resolve;
      });

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(profileQueryPromise),
          }),
        }),
      });

      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      // During loading, mobile menu should not show user info
      expect(screen.queryByTestId("mobile-user-name")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("mobile-create-profile")
      ).not.toBeInTheDocument();

      // Resolve with a user name
      resolveProfileQuery!({ data: { name: "Mobile User" }, error: null });

      // After loading, mobile menu should show the user name
      await waitFor(() => {
        expect(screen.getByTestId("mobile-user-name")).toHaveTextContent(
          "Mobile User"
        );
      });
    });
  });

  describe("Navigation behavior", () => {
    beforeEach(() => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: "Test User" },
              error: null,
            }),
          }),
        }),
      });
    });

    it("should call onLogout when logout button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <Navigation
          currentPage="home"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      const logoutButton = screen.getByText("Logout");
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalled();
    });

    it("should highlight current page in navigation", async () => {
      render(
        <Navigation
          currentPage="discover"
          user={testUser}
          onLogout={mockOnLogout}
        />
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        // The "Discover Profiles" text should have font-semibold class when on the discover page
        const discoverText = screen.getByText("Discover Profiles");
        expect(discoverText).toHaveClass("font-semibold");
      });
    });
  });

  describe("No user scenario", () => {
    it("should not display user info when no user is provided", async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      render(
        <Navigation currentPage="home" user={null} onLogout={mockOnLogout} />
      );

      // Wait for any potential async operations
      await waitFor(() => {
        expect(screen.queryByText(/create a profile/i)).not.toBeInTheDocument();
      });
    });
  });
});
