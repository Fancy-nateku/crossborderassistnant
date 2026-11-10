"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { controlClass } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";

export type ProductSuggestion = {
  id: string;
  officialName: string;
  localNames: string[];
};

const matches = (product: ProductSuggestion, term: string) => {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return (
    product.officialName.toLowerCase().includes(needle) ||
    product.localNames.some((name) => name.toLowerCase().includes(needle))
  );
};

/**
 * Search box with a suggestion list that opens as soon as it is tapped.
 * It only lists products the server already returned (database content);
 * it never adds names of its own. Without JavaScript it is a plain
 * search field that submits the surrounding form.
 */
export function ProductSearch({
  products,
  defaultValue,
}: {
  products: ProductSuggestion[];
  defaultValue: string;
}) {
  const t = useTranslations("product");
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const visible = useMemo(() => products.filter((p) => matches(p, value)), [products, value]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (product: ProductSuggestion) => {
    setValue(product.officialName);
    close();
    const radio = document.querySelector<HTMLInputElement>(
      `input[type="radio"][name="product"][value="${CSS.escape(product.id)}"]`,
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      radio.scrollIntoView?.({ block: "center", behavior: "smooth" });
      radio.focus({ preventScroll: true });
      return;
    }
    // The product is not in the list below (a narrower search is showing):
    // search for its exact name so it appears there.
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.value = product.officialName;
      inputRef.current?.form?.requestSubmit();
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (visible.length ? (i + 1) % visible.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (visible.length ? (i <= 0 ? visible.length - 1 : i - 1) : -1));
    } else if (event.key === "Enter" && open && active >= 0 && visible[active]) {
      event.preventDefault();
      choose(visible[active]);
    } else if (event.key === "Escape") {
      close();
    }
  };

  const showList = open && products.length > 0;

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <span className="pointer-events-none absolute top-4 left-3.5 text-ink-muted">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        id="q"
        name="q"
        type="search"
        enterKeyHint="search"
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby="q-hint"
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`${controlClass} pl-11`}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("suggestionsLabel")}
          className="absolute top-full right-0 left-0 z-10 m-0 mt-1 max-h-72 list-none overflow-y-auto rounded-control border-[1.5px] border-line-strong bg-panel p-1"
          // Keep focus in the input while an option is being tapped.
          onMouseDown={(event) => event.preventDefault()}
        >
          {visible.length === 0 ? (
            <li className="px-3 py-3 text-base text-ink-muted">{t("noSuggestions")}</li>
          ) : (
            visible.map((product, i) => (
              <li
                key={product.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => choose(product)}
                className={`flex min-h-11 cursor-pointer flex-col justify-center rounded-control px-3 py-2 ${
                  i === active ? "bg-muted" : ""
                }`}
              >
                <span className="text-base font-bold text-ink">{product.officialName}</span>
                {product.localNames.length ? (
                  <span className="text-sm text-ink-muted">{product.localNames.join(", ")}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
