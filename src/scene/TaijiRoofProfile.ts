export type TaijiRoofProfile = 'legacy' | 'steady-crafted';

export function calculateRoofHeight(
  base: number,
  rise: number,
  u: number,
  t: number,
  profile: TaijiRoofProfile,
): number {
  if (profile === 'steady-crafted') {
    const eaveProgress = Math.max(0, (t - 0.7) / 0.3);
    const edge = Math.abs(u * 2 - 1);
    const lift = eaveProgress * eaveProgress * (0.18 + 0.3 * Math.pow(edge, 6));
    return base + rise * (1 - t) + lift;
  }
  const upturn = (0.24 + 0.65 * Math.pow(Math.abs(u * 2 - 1), 7)) * Math.pow(t, 9);
  return base + rise * Math.pow(1 - t, 1.65) + upturn;
}
