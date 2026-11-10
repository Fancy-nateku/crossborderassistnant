import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/en.json";
import { ProductSearch } from "./product-search";

const products = [
  { id: "a", officialName: "Maize grain", localNames: ["mahindi"] },
  { id: "b", officialName: "Tomatoes, fresh", localNames: ["nyanya"] },
];

function setup() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <form>
        <ProductSearch products={products} defaultValue="" />
        <input type="radio" name="product" value="a" />
      </form>
    </NextIntlClientProvider>,
  );
}

describe("product search dropdown", () => {
  it("opens with every product as soon as the box is tapped", () => {
    setup();
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("filters by local name as the trader types", () => {
    setup();
    const box = screen.getByRole("combobox");
    fireEvent.change(box, { target: { value: "nyanya" } });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Tomatoes, fresh");
  });

  it("says so when nothing matches", () => {
    setup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByText(messages.product.noSuggestions)).toBeInTheDocument();
  });

  it("choosing a suggestion fills the box, selects the product and closes the list", () => {
    setup();
    const box = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.focus(box);
    fireEvent.click(screen.getByRole("option", { name: /Maize grain/ }));

    expect(box.value).toBe("Maize grain");
    expect((document.querySelector('input[value="a"]') as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports the keyboard", () => {
    setup();
    const box = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(box.value).toBe("Maize grain");
  });
});
