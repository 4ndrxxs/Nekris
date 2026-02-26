export enum Tier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
  MASTER = 'Master',
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  aWon: boolean,
  K = 32,
): { newA: number; newB: number; change: number } {
  const ea = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const sa = aWon ? 1 : 0;
  const change = Math.round(K * (sa - ea));
  return { newA: ratingA + change, newB: ratingB - change, change };
}

export function getTier(elo: number): Tier {
  if (elo < 800) return Tier.BRONZE;
  if (elo < 1000) return Tier.SILVER;
  if (elo < 1200) return Tier.GOLD;
  if (elo < 1400) return Tier.PLATINUM;
  if (elo < 1600) return Tier.DIAMOND;
  return Tier.MASTER;
}
