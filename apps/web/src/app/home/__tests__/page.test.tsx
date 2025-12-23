import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useBannerCounts", () => ({
  useBannerCounts: vi.fn(),
}));

vi.mock("@/hooks/useBadgeCounts", () => ({
  useBadgeCounts: vi.fn(),
}));

vi.mock("@/components/Navigation", () => ({
  default: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="navigation">
      <button onClick={onLogout} data-testid="logout-button">
        Logout
      </button>
    </div>
  ),
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

import { useAuth } from "@/hooks/useAuth";
import { useBannerCounts } from "@/hooks/useBannerCounts";
import { useBadgeCounts } from "@/hooks/useBadgeCounts";

const HomePage = await import("../page").then((m) => m.default);

describe("HomePage", () => {
  const testUser = {
    id: "test-user-123",
    email: "test@example.com",
  };

  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it("should display loading state when auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    render(<HomePage />);
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should display banner data when loaded", async () => {
    const bannerData = {
      total_profiles: 42,
      related_topics: 15,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(bannerData);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    render(<HomePage />);

    await waitFor(() => {
      const profilesText = screen.getAllByText(
        /42 profiles matching your location filter/i
      );
      expect(profilesText.length).toBeGreaterThan(0);
    });
  });

  it("should navigate to matches page when Discover Profiles button is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    const user = userEvent.setup();
    render(<HomePage />);

    const discoverButton = screen.getByText("Discover Profiles");
    await user.click(discoverButton);

    expect(mockPush).toHaveBeenCalledWith("/discover");
  });

  it("should navigate to pending requests when button is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    const user = userEvent.setup();
    render(<HomePage />);

    const pendingButton = screen.getByText("Pending Requests");
    await user.click(pendingButton);

    expect(mockPush).toHaveBeenCalledWith("/pending-requests");
  });

  it("should navigate to profile when My Profile button is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    const user = userEvent.setup();
    render(<HomePage />);

    const profileButton = screen.getByText("My Profile");
    await user.click(profileButton);

    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("should navigate to settings when Settings button is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    const user = userEvent.setup();
    render(<HomePage />);

    const settingsButton = screen.getByText("Settings");
    await user.click(settingsButton);

    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("should handle logout", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    const user = userEvent.setup();
    render(<HomePage />);

    const logoutButton = screen.getByTestId("logout-button");
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it("should render navigation cards even when banner is loading", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(null);

    render(<HomePage />);

    const discoverButtons = screen.getAllByText("Discover Profiles");
    expect(discoverButtons.length).toBeGreaterThan(0);
  });

  it("should display badges on Pending Requests and Matches cards when badge data is loaded", async () => {
    const badgeData = {
      pending_count: 5,
      match_count: 3,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(badgeData);

    render(<HomePage />);

    await waitFor(() => {
      const badges = screen.getAllByText(/^(5|3)$/);
      expect(badges.length).toBe(2);
    });
  });

  it("should not display badges when counts are zero", async () => {
    const badgeData = {
      pending_count: 0,
      match_count: 0,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: testUser,
      isLoading: false,
      logout: mockLogout,
    });
    vi.mocked(useBannerCounts).mockReturnValue(null);
    vi.mocked(useBadgeCounts).mockReturnValue(badgeData);

    render(<HomePage />);

    const badges = screen.queryAllByText(/^(0)$/);
    expect(badges.length).toBe(0);
  });
});
