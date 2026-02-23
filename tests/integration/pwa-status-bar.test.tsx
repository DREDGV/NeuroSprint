import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PwaStatusBar } from "../../src/widgets/PwaStatusBar";

describe("PwaStatusBar", () => {
  it("shows online message by default", () => {
    render(<PwaStatusBar />);
    expect(screen.getByTestId("pwa-status-bar")).toBeInTheDocument();
    expect(screen.getByText(/Онлайн режим/i)).toBeInTheDocument();
  });

  it("shows offline banner when network is unavailable", () => {
    const originalOnline = navigator.onLine;
    try {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false
      });

      render(<PwaStatusBar />);
      expect(screen.getByTestId("pwa-status-bar")).toBeInTheDocument();
      expect(screen.getByText(/Офлайн режим/i)).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => originalOnline
      });
    }
  });
});
