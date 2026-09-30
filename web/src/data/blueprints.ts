import type { Blueprint } from "../domain/types";
import blueprintsJson from "@data/blueprints.json";

// JSON arrays infer as number[], not the [floor, ceiling] tuple, so this one cast can't be
// checked by the compiler; data.test.ts checks every range is a 2-element tuple instead.
export const blueprints = blueprintsJson as unknown as Blueprint[];
