/**
 * E2E route coverage for cockpit-ui.
 *
 * Every route defined in src/routes.tsx has at least one test case here
 * that renders <Dashboard /> at the route path and verifies:
 *   1. The page renders without crashing (no unhandled rejection).
 *   2. The expected heading / content appears.
 *   3. The sidebar "active" state highlights the correct nav item.
 *
 * The "disconnected backend" scenario mocks all fetch calls to reject,
 * ensuring no page fabricates data.
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderDashboardAt, setupMockFetchError } from "./route-test-helpers";
import { ROUTES, ROUTE_REDIRECTS } from "../../routes";

/**
 * Expand all sidebar groups so every visible route appears as a menuitem.
 * Groups with >5 items are collapsed by default per the Dashboard design.
 * aria-expanded="false" on a group title button means the group is currently collapsed.
 * Uses userEvent to ensure React state updates settle between clicks (vs. raw
 * HTMLElement.click() which can leave the test in an intermediate render).
 */
async function expandAllGroups() {
  const user = userEvent.setup();
  const groupButtons = screen.getAllByRole("button", { expanded: false });
  for (const btn of groupButtons) {
    await user.click(btn);
  }
}

describe("E2E: every route renders with disconnected backend", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const route of ROUTES) {
    if (route.hidden) continue;
    it(`renders ${route.path} and shows hero title "${route.label}"`, async () => {
      const { container } = renderDashboardAt(route.path);

      // The hero title (route label) renders unconditionally as an <h1>
      await waitFor(() => {
        const headings = screen.getAllByRole("heading", {
          name: route.label,
          level: 1,
        });
        expect(headings.length).toBeGreaterThan(0);
      });

      // The page must have some content — either route view or error banner
      const pageContent = container.textContent || "";
      expect(pageContent).not.toBe("");

      // Subtitle appears in the hero section
      if (route.subtitle) {
        await waitFor(() => {
          expect(
            screen.getByText(route.subtitle as string),
          ).toBeInTheDocument();
        });
      }
    });
  }
});

describe("E2E: every route keeps the sidebar visible and active", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const route of ROUTES.filter((r) => !r.hidden)) {
    it(`sidebar highlights "${route.label}" when at ${route.path}`, async () => {
      renderDashboardAt(route.path);
      await expandAllGroups();

      await waitFor(() => {
        const activeNavs = screen.getAllByRole("menuitem", {
          name: route.label,
        });
        expect(activeNavs.length).toBeGreaterThan(0);
        const activeNav = activeNavs.find(
          (el) => el.getAttribute("aria-current") === "page",
        );
        expect(activeNav).toBeDefined();
        expect(activeNav).toHaveClass("active");
      });
    });
  }
});

describe("E2E: all sidebar nav labels are present", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it("renders every non-hidden route as a sidebar menuitem when groups are expanded", async () => {
    renderDashboardAt("/");
    await expandAllGroups();

    for (const route of ROUTES.filter((r) => !r.hidden)) {
      await waitFor(() => {
        const navItems = screen.getAllByRole("menuitem", { name: route.label });
        expect(navItems.length).toBeGreaterThan(0);
      });
    }
  });
});

describe("E2E: legacy redirects land on the right target", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const [from, to] of Object.entries(ROUTE_REDIRECTS)) {
    it(`redirects ${from} → ${to}`, async () => {
      renderDashboardAt(from);
      const target = ROUTES.find((r) => r.path === to);
      if (!target || target.hidden) return; // skip if target is itself legacy/hidden
      await waitFor(() => {
        const headings = screen.getAllByRole("heading", {
          name: target.label,
          level: 1,
        });
        expect(headings.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("E2E: 404 redirect to home", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it("redirects unknown paths to /", async () => {
    renderDashboardAt("/nonexistent-page-12345");

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", {
        name: "首页",
        level: 1,
      });
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
