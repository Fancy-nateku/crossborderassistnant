import "server-only";
import { prismaRepository } from "./prisma/repository";
import { mockRepository } from "./mock/repository";
import type { Repository } from "./repository";

const useMockRepository =
  process.env.NODE_ENV === "test" ||
  (process.env.NODE_ENV !== "production" && process.env.USE_MOCK_REPO === "true");

export const repository: Repository = useMockRepository ? mockRepository : prismaRepository;
