import type { Repository } from "../repository";
import {
  borders,
  exchangeRates,
  products,
  requirements,
  rules,
  savedPlans,
  sources,
} from "./fixtures";

const normalise = (s: string) => s.trim().toLowerCase();

export const mockRepository: Repository = {
  async listBorders() {
    return borders.filter((b) => b.active);
  },

  async getBorder(id) {
    return borders.find((b) => b.id === id && b.active) ?? null;
  },

  async searchProducts(query) {
    const q = normalise(query);
    if (!q) return products;
    return products.filter((p) =>
      [p.officialName, ...p.localNames].some((name) => normalise(name).includes(q)),
    );
  },

  async getProduct(id) {
    return products.find((p) => p.id === id) ?? null;
  },

  async getExchangeRate(currency) {
    return exchangeRates.find((r) => r.currency === currency) ?? null;
  },

  async listActiveRules() {
    return rules.filter((r) => r.status === "active");
  },

  async getRequirements(ids) {
    return ids.map((id) => {
      const req = requirements.find((r) => r.id === id);
      if (!req) throw new Error(`Unknown requirement "${id}"`);
      return req;
    });
  },

  async getSourcesForRequirements(reqs) {
    const ids = new Set(reqs.flatMap((r) => r.sourceIds));
    return sources.filter((s) => ids.has(s.id));
  },

  async listSavedPlans() {
    return savedPlans;
  },
};
