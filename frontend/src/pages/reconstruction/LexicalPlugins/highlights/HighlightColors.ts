/**
 * HighlightColors — Single source of truth for code ↔ color mapping.
 * Color is determined by the card's index among active cards.
 */
import { CODE_COLORS } from "@/utils/codeColors";
import useCardStore from "@/stores/useCardStore";

let colorMap = new Map<string, string>();
let lastHash = "";

function rebuild() {
  const { cardData } = useCardStore.getState();
  const activeIds = cardData.filter((c) => c.active !== false).map((c) => c.id);
  const hash = activeIds.join(",");
  if (hash === lastHash) return;
  lastHash = hash;
  colorMap.clear();
  activeIds.forEach((id, i) => {
    colorMap.set(id, CODE_COLORS[i % CODE_COLORS.length].bg);
  });
}

export function getColorForCardId(cardId: string): string {
  rebuild();
  return colorMap.get(cardId) ?? CODE_COLORS[0].bg;
}

export function invalidateColorCache() {
  lastHash = "";
}
