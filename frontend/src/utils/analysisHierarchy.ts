import { concept, code, card } from "@/types/stores";

// Colors from the concept store palette
const CONCEPT_COLORS = [
  "#E3C8C0", "#FFE2D4", "#C9ECCF", "#C9ECE6",
  "#D5ECF9", "#DDDDF3", "#F9D5F8", "#F9D5D5",
];

// Shift a hex color slightly in hue (by adjusting RGB channels)
function shiftColor(hex: string, shift: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Rotate channels slightly
  const sr = Math.min(255, Math.max(0, Math.round(r + shift * 60)));
  const sg = Math.min(255, Math.max(0, Math.round(g - shift * 30)));
  const sb = Math.min(255, Math.max(0, Math.round(b + shift * 20)));
  return `#${sr.toString(16).padStart(2, "0")}${sg.toString(16).padStart(2, "0")}${sb.toString(16).padStart(2, "0")}`;
}

export function lighten(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export type OpenCodeItem = {
  id: string;
  name: string;
  isAI: boolean;
  segments: { id: string; source: string }[];
};

export type SubthemeItem = {
  id: string;
  name: string;
  color: string;
  isAI: boolean;
  definition?: string;
  openCodes: OpenCodeItem[];
};

export type ThemeItem = {
  id: string;
  name: string;
  definition: string;
  color: string;
  isAI: boolean;
  subthemes: SubthemeItem[];
};

type MapData = { themes: ThemeItem[] };

export function buildMapData(conceptData: concept[]): MapData {
  const themes = conceptData.map((concept: concept, ci: number) => {
    // Use the stored color from the concept (assigned during generation), fallback to palette
    const color = concept.color || CONCEPT_COLORS[ci % CONCEPT_COLORS.length];

    // concept.codes is Record<string, code[]> — these are sub-themes
    // Collect all codes across all keys, use their stored colors
    const allCodes = Object.values(concept.codes).flat();
    const subthemes = allCodes.map((codeItem: code, idx: number) => {
      // Use stored color from the code store (sub-theme), fallback to theme color variant
      const hueShift = allCodes.length > 1 ? (idx / allCodes.length) * 0.3 - 0.15 : 0;
      const baseColor = codeItem.color || shiftColor(color, hueShift);

      const openCodes: OpenCodeItem[] = Object.values(codeItem.data || {}).flat().map((c: card) => ({
        id: c.id,
        name: c.name,
        isAI: c.isGPT ?? true,
        segments: (c.topics || []).map((dp) => ({
          id: dp.id || dp.uuid,
          source: dp.content || "",
        })),
      }));

      return {
        id: codeItem.id,
        name: codeItem.name,
        color: baseColor,
        isAI: codeItem.isGPT ?? true,
        definition: codeItem.definition,
        openCodes,
      };
    });

    return {
      id: concept.id,
      name: concept.name,
      definition: concept.definition,
      color,
      isAI: concept.isGPT ?? true,
      subthemes,
    };
  });

  return { themes };
}
