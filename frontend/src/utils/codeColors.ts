// Consistent color palette for open codes
// Each code gets a unique color that's used both for the label and editor highlights
export const CODE_COLORS = [
  { bg: "#E8B4B8", text: "#8B3A3A", light: "#FDE8EA" }, // rose
  { bg: "#A8D5BA", text: "#2D6A4F", light: "#E6F5EC" }, // sage
  { bg: "#B4C7E8", text: "#2C4A7C", light: "#E8EFF9" }, // blue
  { bg: "#E8D4A8", text: "#7C5B28", light: "#FDF5E6" }, // gold
  { bg: "#C8A8E8", text: "#5B2C7C", light: "#F0E6F9" }, // purple
  { bg: "#A8E8D5", text: "#1B6B5A", light: "#E2F7F0" }, // teal
  { bg: "#E8A8B4", text: "#7C2C4A", light: "#F9E6EC" }, // pink
  { bg: "#D4E8A8", text: "#4A6B1B", light: "#F0F7E2" }, // lime
  { bg: "#E8C8A8", text: "#6B4A1B", light: "#F7F0E2" }, // orange
  { bg: "#A8B4E8", text: "#2C3A7C", light: "#E6E8F9" }, // indigo
  { bg: "#B8E8A8", text: "#3A6B1B", light: "#EAF7E2" }, // green
  { bg: "#E8A8C8", text: "#7C1B4A", light: "#F9E2F0" }, // magenta
];

export function getCodeColor(index: number) {
  return CODE_COLORS[index % CODE_COLORS.length];
}
