import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock components
vi.mock("@/components/Navigation", () => ({
  default: () => <div data-testid="navigation">Navigation</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// Mock useMarkProfileSeen hook
const mockMarkAsSeen = vi.fn();
vi.mock("@/hooks/useMarkProfileSeen", () => ({
  useMarkProfileSeen: () => ({ markAsSeen: mockMarkAsSeen }),
}));

// Import after mocks
const MyMatchesPage = await import("../page").then((m) => m.default);

describe("MyMatchesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockMarkAsSeen.mockClear();
  });

  it("should redirect to landing page when not authenticated", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<MyMatchesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("should display loading state initially when authenticated", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: "test-user", email: "test@example.com" },
              access_token: "test-token",
            },
          },
        }),
        signOut: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      })),
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<MyMatchesPage />);

    // Should show loader initially
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should call markAsSeen when a match is displayed", async () => {
    const matchUserId = "match-user-123";
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: "test-user", email: "test@example.com" },
              access_token: "test-token",
            },
          },
        }),
        signOut: vi.fn(),
      },
      from: vi.fn((table: string) => {
        if (table === "matches") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  user_a: "test-user",
                  user_b: matchUserId,
                  created_at: "2023-01-01T00:00:00Z",
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: "Test Match", bio: "Test bio" },
            error: null,
          }),
        };
      }),
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<MyMatchesPage />);

    await waitFor(
      () => {
        expect(mockMarkAsSeen).toHaveBeenCalledWith(matchUserId);
      },
      { timeout: 3000 }
    );
  });
});
