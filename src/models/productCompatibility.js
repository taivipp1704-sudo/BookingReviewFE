const COMMON_ACCESSORIES = ["ACC-CARD-SD64", "ACC-READER-SD", "ACC-STRAP", "ACC-SKIN", "ACC-BAG-KIT"];

const CAMERA_KITS = [
  { match: /canon\s+(r50|m6)\b/i, ids: ["ACC-BAT-LPE17", "ACC-CHG-LCE17"] },
  { match: /canon\s+(m50|m100|m200|m10)\b/i, ids: ["ACC-BAT-LPE12", "ACC-CHG-LCE12"] },
  { match: /canon\s+g7x/i, ids: ["ACC-BAT-NB13L", "ACC-CHG-NB13L"] },
  { match: /fuji\s+x-?a5/i, ids: ["ACC-BAT-NPW126S", "ACC-CHG-NPW126S"] },
  { match: /fuji\s+x-?m5/i, ids: ["ACC-BAT-NPW126S", "ACC-CHG-NPW126S", "ACC-CARD-SD128"] },
  { match: /ixy\s*600f/i, ids: ["ACC-BAT-NB4L", "ACC-CHG-NB4L"] },
  { match: /ixy\s*650f?/i, ids: ["ACC-BAT-NB11LH", "ACC-CHG-CB2LFE"] },
  { match: /pocket\s*3/i, ids: ["ACC-POWER-POCKET3", "ACC-CHG-USBC", "ACC-CARD-MICROSD128", "ACC-READER-MICROSD"] },
];

export function compatibleAccessoryIds(product) {
  const name = String(product?.name || product?.brand || "").trim();
  const kit = CAMERA_KITS.find((item) => item.match.test(name));
  if (!kit) return [];
  const common = /pocket\s*3/i.test(name)
    ? ["ACC-STRAP", "ACC-SKIN", "ACC-BAG-KIT"]
    : COMMON_ACCESSORIES;
  const ids = [...kit.ids, ...common];
  if (/fuji\s+x-?m5/i.test(name)) {
    return [...new Set(ids.filter((id) => id !== "ACC-CARD-SD64"))];
  }
  return [...new Set(ids)];
}
