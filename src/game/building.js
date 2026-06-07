export const BUILD_CATALOG = [
  {
    id: "wall",
    name: "Wall",
    label: "Buy Wall",
    currency: "flies",
    cost: 3,
    color: "#f3c176",
    accent: "#8f5a2e",
    w: 72,
    h: 58,
    kind: "house",
  },
  {
    id: "roof",
    name: "Roof",
    label: "Buy Roof",
    currency: "amber",
    cost: 2,
    color: "#df6756",
    accent: "#8f2e38",
    w: 92,
    h: 46,
    kind: "roof",
  },
  {
    id: "window",
    name: "Window",
    label: "Buy Window",
    currency: "pearls",
    cost: 1,
    color: "#bdefff",
    accent: "#477d91",
    w: 42,
    h: 34,
    kind: "window",
  },
  {
    id: "lantern",
    name: "Lantern",
    label: "Buy Lantern",
    currency: "amber",
    cost: 1,
    color: "#ffd86a",
    accent: "#b36a27",
    w: 34,
    h: 52,
    kind: "decor",
  },
  {
    id: "fern",
    name: "Fern",
    label: "Buy Fern",
    currency: "flies",
    cost: 2,
    color: "#4fad5d",
    accent: "#1f6b3d",
    w: 48,
    h: 42,
    kind: "plant",
  },
];

export function getBuildItem(id) {
  return BUILD_CATALOG.find((item) => item.id === id) ?? null;
}

export function buildCurrencyLabel(currency) {
  if (currency === "pearls") return "pearls";
  if (currency === "amber") return "amber";
  return "flies";
}
