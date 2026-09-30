import type { Player } from "../domain/types";
import playersJson from "@data/players.json";

export const players = playersJson as Player[];
