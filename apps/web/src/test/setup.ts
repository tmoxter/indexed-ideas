import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { setupServer } from "msw/node";
import React from "react";

vi.mock("server-only", () => ({}));

// Mock EmptyState to avoid Supabase storage dependency
vi.mock("@/components/EmptyState", () => ({
  EmptyState: ({ title, description, actionText, onAction }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "empty-state" },
      React.createElement("h2", null, title),
      React.createElement("p", null, description),
      React.createElement("button", { onClick: onAction }, actionText)
    );
  },
}));

// Mock DiscoverLoading to avoid Supabase storage dependency
vi.mock("@/components/DiscoverLoading", () => ({
  DiscoverLoading: ({ currentPage, userEmail, onLogout }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "discover-loading" },
      "Searching..."
    );
  },
}));

// Setup MSW server for API mocking (with bypass for unhandled requests)
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// Mock react-loader-spinner to avoid JSX rendering issues in happy-dom
vi.mock("react-loader-spinner", () => ({
  Circles: ({ visible, ...props }: any) => {
    if (!visible) return null;
    return React.createElement(
      "div",
      { "data-testid": "circles-loader", ...props },
      "Loading..."
    );
  },
  Rings: ({ visible = true, ...props }: any) => {
    if (!visible) return null;
    return React.createElement(
      "div",
      { "data-testid": "rings-loader", ...props },
      "Loading..."
    );
  },
  InfinitySpin: ({ color, width, ...props }: any) => {
    return React.createElement(
      "div",
      { "data-testid": "infinity-spin", ...props },
      "Loading..."
    );
  },
}));
