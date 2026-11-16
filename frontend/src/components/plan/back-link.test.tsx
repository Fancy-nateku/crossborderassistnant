import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pathname } from "@/test/mocks/navigation";
import { BackLink } from "./back-link";

vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const TRAIL_KEY = "crossborderassist.back-trail";

function visit(path: string, href: string) {
  pathname.current = path;
  return render(<BackLink href={href}>Back</BackLink>);
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  pathname.current = "/";
});

describe("BackLink", () => {
  it("steps back in history when the target is the screen the user came from", () => {
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(["/plan/route"]));
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    visit("/plan/product", "/plan/route");

    const link = screen.getByRole("link", { name: "Back" });
    const notPrevented = fireEvent.click(link);

    expect(back).toHaveBeenCalledOnce();
    expect(notPrevented).toBe(false);
  });

  it("falls back to the link when there is no matching previous screen", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    visit("/plan/route", "/");

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Back" }));

    expect(back).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });

  it("leaves modified clicks to the browser", () => {
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(["/plan/route"]));
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    visit("/plan/product", "/plan/route");

    fireEvent.click(screen.getByRole("link", { name: "Back" }), { ctrlKey: true });

    expect(back).not.toHaveBeenCalled();
  });
});
