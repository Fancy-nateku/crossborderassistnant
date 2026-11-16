import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, renderScreen } from "@/test/screen";
import LoginPage from "./login/page";
import RegisterPage from "./register/page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));
vi.mock("next-auth/react", () => ({ signIn: vi.fn(), signOut: vi.fn() }));

describe("sign-in and register screens", () => {
  it("puts the login form in one card under the site header", async () => {
    await renderScreen(LoginPage);

    const form = screen.getByRole("heading", { level: 1, name: messages.auth.loginTitle }).closest("form");
    expect(form).not.toBeNull();
    expect(form?.parentElement).toHaveClass("border", "bg-panel", "rounded-control");
    expect(screen.getByRole("link", { name: messages.app.name })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: messages.auth.register })).toHaveAttribute("href", "/register");
  });

  it("puts the register form in the same card", async () => {
    await renderScreen(RegisterPage);

    const form = screen.getByRole("heading", { level: 1, name: messages.auth.registerTitle }).closest("form");
    expect(form?.parentElement).toHaveClass("border", "bg-panel", "rounded-control");
    expect(screen.getByRole("link", { name: new RegExp(`^${messages.auth.login}$`) })).toBeInTheDocument();
  });
});
