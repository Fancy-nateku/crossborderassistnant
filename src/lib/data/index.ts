import { mockRepository } from "./mock/repository";
import type { Repository } from "./repository";

// Swap for the Prisma-backed implementation when the backend lands.
export const repository: Repository = mockRepository;
