export const COLOR_PALETTE = [
  '#6264A7',
  '#0078D4',
  '#107C10',
  '#D83B01',
  '#8764B8',
  '#038387',
  '#E3008C',
  '#FF8C00',
  '#FFD700',
  '#00B7C3',
  '#FF5252',
  '#7C4DFF',
  '#00C853',
  '#FF6D00',
  '#2979FF',
  '#F50057',
  '#AA00FF',
  '#1DE9B6',
  '#FF1744',
  '#651FFF',
] as const;

export function pickRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}
