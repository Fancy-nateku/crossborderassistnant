import { expect, test } from "@playwright/test";
import { SCREENS } from "./screens";

/**
 * Text contrast, measured on the rendered page (WCAG 2.1 AA, 1.4.3; NFR-05, NFR-06).
 * CLAUDE.md asks for high contrast because traders read these screens outdoors, so this
 * reads the colours the browser actually computed rather than trusting the token table.
 *
 * Only text is checked here. Non-text contrast (1.4.11: input borders, focus rings) and
 * hover and focus states are not covered; see docs/log.md.
 */

/** AA: 4.5:1 for body text, 3:1 for large text (>= 24 px, or >= 18.66 px bold). */
const NORMAL_RATIO = 4.5;
const LARGE_RATIO = 3;

type Sample = {
  text: string;
  color: string;
  background: string;
  fontPx: number;
  bold: boolean;
  ratio: number;
  required: number;
};

for (const { name, path } of SCREENS) {
  test(`${name} keeps every piece of text readable`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);

    const { checked, failures } = await page.$$eval(
      "body *",
      (nodes, limits) => {
        /** Pull the numbers out of rgb() or rgba(); alpha defaults to 1. */
        function parse(color: string): number[] {
          const parts = (color.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number);
          return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
        }

        function relativeLuminance(rgb: number[]): number {
          const channel = (value: number) => {
            const s = value / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return (
            0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
          );
        }

        /** Composite a translucent layer over an opaque one. */
        function flatten(layer: number[], base: number[]): number[] {
          const alpha = layer[3];
          return [0, 1, 2].map((i) => layer[i] * alpha + base[i] * (1 - alpha));
        }

        /**
         * What is actually behind the text: the nearest painted ancestor background,
         * with any translucent layers above it composited back down onto white.
         */
        function backgroundOf(element: Element): number[] {
          const layers: number[][] = [];
          let node: Element | null = element;
          while (node) {
            const layer = parse(getComputedStyle(node).backgroundColor);
            if (layer[3] > 0) {
              layers.push(layer);
              if (layer[3] === 1) break;
            }
            node = node.parentElement;
          }
          let base = [255, 255, 255];
          for (let i = layers.length - 1; i >= 0; i -= 1) base = flatten(layers[i], base);
          return base;
        }

        function ratioBetween(a: number[], b: number[]): number {
          const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
            (x, y) => y - x,
          );
          return (light + 0.05) / (dark + 0.05);
        }

        const samples: Sample[] = [];

        for (const node of nodes) {
          const ownText = [...node.childNodes]
            .filter((child) => child.nodeType === Node.TEXT_NODE)
            .map((child) => child.textContent ?? "")
            .join("")
            .trim();
          if (!ownText) continue;

          const style = getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") continue;
          if (Number.parseFloat(style.opacity) === 0) continue;

          const fontPx = Number.parseFloat(style.fontSize);
          const bold = Number.parseInt(style.fontWeight, 10) >= 700;
          const large = fontPx >= 24 || (bold && fontPx >= 18.66);
          const required = large ? limits.large : limits.normal;

          const foreground = parse(style.color);
          const background = backgroundOf(node);
          // Text drawn on its own background colour is composited the same way.
          const ratio = ratioBetween(flatten(foreground, background), background);

          samples.push({
            text: ownText.slice(0, 40),
            color: style.color,
            background: `rgb(${background.map(Math.round).join(", ")})`,
            fontPx,
            bold,
            ratio: Math.round(ratio * 100) / 100,
            required,
          });
        }

        return {
          checked: samples.length,
          failures: samples.filter((sample) => sample.ratio < sample.required),
        };
      },
      { normal: NORMAL_RATIO, large: LARGE_RATIO },
    );

    // Without this a selector or filter bug would read as a pass.
    expect(checked).toBeGreaterThan(5);
    expect(failures).toEqual([]);
  });
}
