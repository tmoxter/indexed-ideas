import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockAuthenticateUser = vi.hoisted(() => vi.fn());
const mockExtractBearerToken = vi.hoisted(() => vi.fn());
const mockMarkProfileAsSeen = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/server/logic/auth", () => ({
  extractBearerToken: mockExtractBearerToken,
  authenticateUser: mockAuthenticateUser,
}));

vi.mock("@/server/services/matching.service", () => ({
  markProfileAsSeen: mockMarkProfileAsSeen,
}));

const { POST } = await import("../route");

describe("POST /api/mark-profile-seen", () => {
  const testUserId = "test-user-123";
  const testProfileId = "profile-456";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      body: JSON.stringify({ profileId: testProfileId }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("No authorization header");
    expect(mockAuthenticateUser).not.toHaveBeenCalled();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockExtractBearerToken.mockReturnValue("invalid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: null,
      error: new Error("Invalid token"),
    });

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ profileId: testProfileId }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("User not authenticated");
  });

  it("should return 400 when profileId is missing", async () => {
    mockExtractBearerToken.mockReturnValue("valid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("profileId is required");
    expect(mockMarkProfileAsSeen).not.toHaveBeenCalled();
  });

  it("should mark profile as seen successfully", async () => {
    mockExtractBearerToken.mockReturnValue("valid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockMarkProfileAsSeen.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ profileId: testProfileId }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockMarkProfileAsSeen).toHaveBeenCalledWith(
      expect.anything(),
      testUserId,
      testProfileId
    );
  });

  it("should handle service errors gracefully", async () => {
    mockExtractBearerToken.mockReturnValue("valid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockMarkProfileAsSeen.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ profileId: testProfileId }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Server error");
  });

  it("should handle missing environment variables", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = new NextRequest("http://localhost/api/mark-profile-seen", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ profileId: testProfileId }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing Supabase configuration");

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });
});
