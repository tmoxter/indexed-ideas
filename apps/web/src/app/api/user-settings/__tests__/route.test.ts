import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockExtractBearerToken = vi.hoisted(() => vi.fn());
const mockAuthenticateUser = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/server/logic/auth", () => ({
  extractBearerToken: mockExtractBearerToken,
  authenticateUser: mockAuthenticateUser,
}));

const { GET, POST } = await import("../route");

describe("GET /api/user-settings", () => {
  const testUserId = "test-user-123";
  const validToken = "valid-token-xyz";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "GET",
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user is not authenticated", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: null,
      error: new Error("Invalid token"),
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return default settings when user has no settings", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      similarity_threshold: 2,
      region_scope: "region",
    });
  });

  it("should return existing user settings", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSettings = {
      id: "setting-id-123",
      user_id: testUserId,
      similarity_threshold: 3,
      region_scope: "worldwide",
      updated_at: "2024-01-01T00:00:00.000Z",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockSettings,
              error: null,
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockSettings);
  });

  it("should return 500 when database query fails", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Database error"),
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch settings");
  });
});

describe("POST /api/user-settings", () => {
  const testUserId = "test-user-123";
  const validToken = "valid-token-xyz";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      body: JSON.stringify({
        similarity_threshold: 2,
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user is not authenticated", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: null,
      error: new Error("Invalid token"),
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 2,
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when similarity_threshold is missing", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid similarity_threshold. Must be 1, 2, 3, or 4."
    );
  });

  it("should return 400 when similarity_threshold is invalid", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 5,
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid similarity_threshold. Must be 1, 2, 3, or 4."
    );
  });

  it("should return 400 when region_scope is missing", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 2,
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid region_scope. Must be 'city', 'country', 'region', or 'worldwide'."
    );
  });

  it("should return 400 when region_scope is invalid", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 2,
        region_scope: "invalid",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Invalid region_scope. Must be 'city', 'country', 'region', or 'worldwide'."
    );
  });

  it("should successfully save user settings", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSavedSettings = {
      id: "setting-id-123",
      user_id: testUserId,
      similarity_threshold: 3,
      region_scope: "worldwide",
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSavedSettings,
              error: null,
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 3,
        region_scope: "worldwide",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Settings saved successfully");
    expect(data.data).toEqual(mockSavedSettings);

    const fromCall = mockSupabase.from.mock.calls[0][0];
    expect(fromCall).toBe("user_settings");
  });

  it("should handle all valid region_scope values", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const validScopes = ["city", "country", "region", "worldwide"];

    for (const scope of validScopes) {
      const request = new NextRequest("http://localhost/api/user-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          similarity_threshold: 2,
          region_scope: scope,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    }
  });

  it("should handle all valid similarity_threshold values", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const validThresholds = [1, 2, 3, 4];

    for (const threshold of validThresholds) {
      const request = new NextRequest("http://localhost/api/user-settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          similarity_threshold: threshold,
          region_scope: "city",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    }
  });

  it("should return 500 when database upsert fails", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("Database error"),
            }),
          }),
        }),
      }),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 2,
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save settings");
  });

  it("should handle unexpected errors gracefully", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockRejectedValue(new Error("Network error"));

    const request = new NextRequest("http://localhost/api/user-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        similarity_threshold: 2,
        region_scope: "city",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("An unexpected error occurred");
  });
});
