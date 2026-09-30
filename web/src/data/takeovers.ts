import type { Takeover } from "../domain/types";
import takeoversJson from "@data/takeovers.json";

export const takeovers = takeoversJson as Takeover[];
