import type { Attribute } from "../domain/attributes";
import attributeDescriptionsJson from "@data/attribute-descriptions.json";

export const attributeDescriptions = attributeDescriptionsJson as Record<Attribute, string>;
