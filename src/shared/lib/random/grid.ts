export function generateSchulteGrid(size = 5): number[] {
  const count = size * size;
  const values = Array.from({ length: count }, (_, index) => index + 1);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

