import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import PlansPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const input = {
  from: "KE",
  to: "UG",
  borderId: "busia",
  productId: "beans-dry",
  quantity: 5,
  unit: "bags",
  currency: "KES",
  valueLocal: 30000,
} as const;

const plan = (id: string, borderId: string, doneCount: number) => ({
  id,
  input: { ...input, borderId },
  verdict: "likely_str_eligible",
  doneCount,
  totalCount: 4,
  savedAt: "2026-11-10T07:00:00.000Z",
});

function stubBackend(options: { user: boolean; plans?: unknown[]; listStatus?: number }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/auth/session")) return Response.json(options.user ? { user: { id: "u1" } } : {});
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (options.listStatus && options.listStatus !== 200) return new Response("{}", { status: options.listStatus });
    return Response.json({ data: options.plans ?? [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function renderPlans() {
  await renderScreen(PlansPage);
  await act(async () => {});
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("saved plans screen", () => {
  it("titles the page", async () => {
    stubBackend({ user: true });
    expect(await metadataTitle(generateMetadata)).toBe(messages.plans.meta);

    await renderPlans();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.plans.title);
  });

  it("asks a signed-out visitor to sign in, and does not list anything from this device", async () => {
    stubBackend({ user: false });
    window.localStorage.setItem("crossborderassist.device-plans.v1", JSON.stringify({ plans: [{ id: "x" }] }));
    await renderPlans();

    expect(screen.getByRole("heading", { name: messages.plans.signedOutTitle })).toBeInTheDocument();
    const signIn = screen.getByRole("link", { name: messages.plans.signedOutCta });
    expect(signIn.getAttribute("href")).toContain("/login?next=");
    expect(screen.getByRole("link", { name: messages.plans.signedOutRegister }).getAttribute("href")).toContain("/register?next=");
    expect(screen.queryByText(/stored only on this device/)).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows nothing until the session check finishes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderScreen(PlansPage);

    expect(screen.queryByRole("heading", { name: messages.plans.signedOutTitle })).not.toBeInTheDocument();
    expect(screen.queryByText(messages.account.empty)).not.toBeInTheDocument();
  });

  it("shows an empty state for an account with no plans", async () => {
    stubBackend({ user: true, plans: [] });
    await renderPlans();

    expect(await screen.findByText(messages.account.empty)).toBeInTheDocument();
  });

  it("lists the account's plans with the progress the server holds", async () => {
    stubBackend({ user: true, plans: [plan("p1", "busia", 4), plan("p2", "malaba", 1)] });
    await renderPlans();

    expect(await screen.findByText(/^4 of 4 steps done/)).toBeInTheDocument();
    expect(screen.getByText(/^1 of 4 steps done/)).toBeInTheDocument();
    const open = screen.getAllByRole("link", { name: messages.account.open });
    expect(open).toHaveLength(2);
    expect(open[0].getAttribute("href")).toContain("/plan/result?");
  });

  it("says so when the plans cannot be loaded", async () => {
    stubBackend({ user: true, listStatus: 401 });
    await renderPlans();

    expect(await screen.findByRole("alert")).toHaveTextContent(messages.account.loadError);
  });

  it("asks before deleting a plan, then removes it", async () => {
    const fetchMock = stubBackend({ user: true, plans: [plan("p1", "busia", 0)] });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderPlans();

    fireEvent.click(await screen.findByRole("button", { name: messages.account.delete }));
    expect(confirm).toHaveBeenCalledWith(messages.account.deleteConfirm);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: messages.account.delete }));
    await waitFor(() => expect(screen.getByText(messages.account.empty)).toBeInTheDocument());
  });
});
