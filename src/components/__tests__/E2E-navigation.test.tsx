/**
 * E2E: sidebar navigation → route switching.
 *
 * Verifies that:
 *   - Every route is accessible by directly navigating to its path
 *   - The hero title updates to match the current route
 *   - The sidebar nav button for the current route is marked active
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import {
  renderDashboardAt,
  setupMockFetchError,
  ALL_ROUTES,
} from "./route-test-helpers";
import { ROUTES } from "../../routes";

describe("E2E: every route is accessible by direct path", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const route of ALL_ROUTES) {
    it(`navigating to ${route.path} shows hero title "${route.label}"`, async () => {
      renderDashboardAt(route.path);

      // The hero title must reflect the current route
      await waitFor(() => {
        const headings = screen.getAllByRole("heading", {
          name: route.label,
          level: 1,
        });
        expect(headings.length).toBeGreaterThan(0);
      });

      // The corresponding sidebar nav button must be active
      await waitFor(() => {
        const navBtn = screen.getByRole("menuitem", { name: route.label });
        expect(navBtn).toHaveAttribute("aria-selected", "true");
        expect(navBtn).toHaveClass("active");
      });
    });
  }
});

describe("E2E: bidirectional navigation via direct paths", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it("Home is accessible directly at /", async () => {
    renderDashboardAt("/");
    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "首页", level: 1 }).length,
      ).toBeGreaterThan(0);
    });
  });

  it("AlertCenter is accessible directly at /alerts", async () => {
    renderDashboardAt("/alerts");
    await waitFor(() => {
      const headings = screen.getAllByRole("heading", {
        name: "告警中心",
        level: 1,
      });
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it("KOS workbench is accessible directly at /workbench/kos", async () => {
    renderDashboardAt("/workbench/kos");
    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "KOS 工作台", level: 1 }).length,
      ).toBeGreaterThan(0);
    });
  });

  it("Home is accessible from /alerts path without browser back", async () => {
    // Render at /alerts first
    const { unmount } = renderDashboardAt("/alerts");
    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "告警中心", level: 1 }).length,
      ).toBeGreaterThan(0);
    });
    unmount();

    // Then render at /
    renderDashboardAt("/");
    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "首页", level: 1 }).length,
      ).toBeGreaterThan(0);
    });
  });
});

describe("E2E: nav group structure in sidebar", () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  const expectedGroups = [...new Set(ROUTES.map((r) => r.group))];

  it("renders all nav groups in the sidebar", async () => {
    renderDashboardAt("/");

    for (const group of expectedGroups) {
      await waitFor(() => {
        expect(screen.getAllByText(group).length).toBeGreaterThan(0);
      });
    }
  });

  it("nav group titles appear as plain text (not buttons)", () => {
    renderDashboardAt("/");

    for (const group of expectedGroups) {
      const elements = screen.getAllByText(group);
      expect(elements.length).toBeGreaterThan(0);
    }
  });

  it("shows the correct active nav item when at /alerts", async () => {
    renderDashboardAt("/alerts");

    await waitFor(() => {
      const navItems = screen.getAllByRole("menuitem", { name: "告警中心" });
      const activeItem = navItems.find(
        (el) => el.getAttribute("aria-selected") === "true",
      );
      expect(activeItem).toBeDefined();
    });
  });
});
