export type EntityType =
  | "urn:entity:artist"
  | "urn:entity:book"
  | "urn:entity:brand"
  | "urn:entity:destination"
  | "urn:entity:movie"
  | "urn:entity:person"
  | "urn:entity:place"
  | "urn:entity:podcast"
  | "urn:entity:tv_show"
  | "urn:entity:video_game";

export type ParamValue = string | number | boolean | string[];

export type Params = Record<string, ParamValue | undefined>;

export type QlooEntity = {
  entity_id: string;
  name: string;
  type?: string;
  types?: string[];
  subtype?: string;
  popularity?: number;
  tags?: Array<Record<string, unknown>>;
  properties?: Record<string, unknown>;
  query?: {
    affinity?: number;
    explainability?: unknown;
    measurements?: unknown;
  };
};
