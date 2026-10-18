import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { products } from "@/lib/data/mock/fixtures";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import ProductPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const options = () =>
  within(
    screen.getByRole("group", { name: messages.product.resultsLabel }),
  ).getAllByRole("radio") as HTMLInputElement[];

describe("product screen (step 2)", () => {
  it("titles the page and marks it as the second of three steps", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.product.meta);

    await renderScreen(ProductPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.product.title);
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("goes back to the route step with the plan intact", async () => {
    await renderScreen(ProductPage, { border: "malaba", qty: "5" });

    const back = screen.getByRole("link", { name: messages.common.back });
    expect(back).toHaveAttribute("href", expect.stringContaining("/plan/route?"));
    expect(back.getAttribute("href")).toContain("border=malaba");
    expect(back.getAttribute("href")).toContain("qty=5");
  });

  it("lists every product with its Common List status in words (CLAUDE.md rule 3)", async () => {
    await renderScreen(ProductPage);

    expect(options()).toHaveLength(products.length);
    expect(screen.getAllByText(messages.product.listYes)).toHaveLength(1);
    expect(screen.getAllByText(messages.product.listNo)).toHaveLength(1);
    expect(screen.getAllByText(messages.product.listUnknown)).toHaveLength(2);
  });

  it("finds goods by the local name a trader uses", async () => {
    await renderScreen(ProductPage, { q: "maharagwe" });

    const radios = options();
    expect(radios).toHaveLength(1);
    expect(radios[0].value).toBe("beans-dry");
    expect(screen.getByText("Beans, dry")).toBeInTheDocument();
    expect(screen.getByText("Also called maharagwe")).toBeInTheDocument();
    expect(screen.getByText("1 match")).toBeInTheDocument();
  });

  it("counts several matches", async () => {
    await renderScreen(ProductPage, { q: "bean" });

    expect(options()).toHaveLength(3);
    expect(screen.getByText("3 matches")).toBeInTheDocument();
  });

  it("says plainly when nothing matches, naming the query", async () => {
    await renderScreen(ProductPage, { q: "bicycle" });

    expect(screen.getByText("No match for “bicycle”. Try another name.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: messages.product.resultsLabel })).queryAllByRole(
        "radio",
      ),
    ).toHaveLength(0);
  });

  it("keeps the product the trader already chose selected", async () => {
    await renderScreen(ProductPage, { product: "maize-grain" });

    expect(options().find((r) => r.value === "maize-grain")).toBeChecked();
  });

  it("lets the trader skip the match and drops the stale product from the link", async () => {
    await renderScreen(ProductPage, { product: "beans-dry", border: "busia" });

    const skip = screen.getByRole("link", { name: "Skip this step" });
    expect(skip.getAttribute("href")).toContain("/plan/value?");
    expect(skip.getAttribute("href")).toContain("border=busia");
    expect(skip.getAttribute("href")).not.toContain("product=");
  });

  it("submits the chosen product to the value step without client JS", async () => {
    const { container } = await renderScreen(ProductPage);

    const form = container.querySelector("#product-form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/en/plan/value");
    expect(screen.getByRole("button", { name: messages.product.next })).toHaveAttribute(
      "form",
      "product-form",
    );
    // The search box is its own GET form, so searching does not advance the wizard.
    expect(screen.getByRole("search")).toHaveAttribute("action", "/en/plan/product");
  });

  it("labels the search box and keeps the query in it", async () => {
    await renderScreen(ProductPage, { q: "maize" });

    const box = screen.getByLabelText(messages.product.searchLabel);
    expect(box).toHaveValue("maize");
    expect(screen.getByText(messages.product.searchHint)).toBeInTheDocument();
  });
});
