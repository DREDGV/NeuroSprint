import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PwaStatusBar } from "../../src/widgets/PwaStatusBar";

describe("PwaStatusBar", () => {
  it("is hidden by default in normal online browser mode", () => {
    render(<PwaStatusBar />);
    expect(screen.queryByTestId("pwa-status-bar")).not.toBeInTheDocument();
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

  it("shows install CTA when beforeinstallprompt is available", async () => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
      preventDefault: vi.fn()
    });

    render(<PwaStatusBar />);
    fireEvent(window, event);

    expect(await screen.findByTestId("pwa-status-bar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Установить приложение/i })
    ).toBeInTheDocument();
  });
});
