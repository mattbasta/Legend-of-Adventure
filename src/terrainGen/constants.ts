export const RegionType = {
  Field: "field",
  Dungeon: "dungeon",
  Shop: "shop",
  House: "house",
} as const;
export type RegionType = (typeof RegionType)[keyof typeof RegionType];

export const WorldType = {
  Overworld: "overworld",
  Ether: "ether",
} as const;
export type WorldType = (typeof WorldType)[keyof typeof WorldType];
