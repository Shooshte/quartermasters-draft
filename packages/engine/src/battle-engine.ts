export type BattleResult = {
  winnerId: string | null;
  log: string[];
};

export class BattleEngine {
  resolve(): BattleResult {
    return {
      winnerId: null,
      log: ["Battle resolution not yet implemented"],
    };
  }
}
