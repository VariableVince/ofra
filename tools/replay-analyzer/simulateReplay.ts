import { performance } from "node:perf_hooks";
import { createGameRunnerForReplay } from "./gameRunnerForReplay";
import type { OpenFrontRuntime } from "./openfrontLoader";
import type { TickSample } from "./types";

export type SimulationResult = {
  runner: any;
  elapsedMs: number;
  samples: TickSample[];
  tickExecutionMsValues: number[];
  totalIntents: number;
  intentsByType: Record<string, number>;
  hashesCompared: number;
  hashMismatches: number;
  hashMismatchSamples: { tick: number; expected: number; actual: number }[];
  maxTilesBySmallID: Map<number, number>;
};

function countHumans(openfront: OpenFrontRuntime, game: any): {
  aliveHumans: number;
  connectedAliveHumans: number;
  spawnedHumans: number;
} {
  const humans = game.players().filter((p: any) => p.type() === (openfront.Game.PlayerType as any).Human);
  const alive = humans.filter((p) => p.isAlive()).length;
  const connectedAlive = humans.filter((p) => p.isAlive() && !p.isDisconnected()).length;
  const spawned = humans.filter((p) => p.hasSpawned()).length;
  return { aliveHumans: alive, connectedAliveHumans: connectedAlive, spawnedHumans: spawned };
}

export async function simulateReplay(opts: {
  openfront: OpenFrontRuntime;
  gameStartInfo: any;
  clientID: string;
  mapsRoot: string;
  turnsToRun: any[];
  expectedHashes: ReadonlyMap<number, number>;
  progressEvery: number;
  progressLog?: (msg: string) => void;
  onAfterTick?: (arg: { game: any; turn: any; conquestEvents: any[]; isLast: boolean }) => void;
  onGameInitialized?: (game: any) => void;
}): Promise<SimulationResult> {
  let lastTickExecutionMs = 0;
  let lastGameTick = 0;
  let hashesCompared = 0;
  let hashMismatches = 0;
  const hashMismatchSamples: { tick: number; expected: number; actual: number }[] = [];
  let conquestEvents: any[] = [];

  let runner: any;
  runner = await createGameRunnerForReplay(
    opts.openfront,
    opts.gameStartInfo,
    opts.clientID,
    (gu: any) => {
      if (!("updates" in gu)) {
        throw new Error(`Game error: ${gu.errMsg}\n${gu.stack ?? ""}`);
      }
      lastTickExecutionMs = gu.tickExecutionDuration ?? 0;
      lastGameTick = gu.tick;

      const { GameUpdateType } = opts.openfront.GameUpdates as any;
      conquestEvents = (gu.updates[GameUpdateType.ConquestEvent] ?? []) as any[];

      for (const hu of gu.updates[GameUpdateType.Hash] ?? []) {
        const expected = opts.expectedHashes.get(hu.tick);
        if (expected === undefined) continue;
        hashesCompared++;
        if (expected !== hu.hash) {
          hashMismatches++;
          if (hashMismatchSamples.length < 10) {
            hashMismatchSamples.push({ tick: hu.tick, expected, actual: hu.hash });
          }
        }
      }
    },
    opts.mapsRoot,
  );

  opts.onGameInitialized?.(runner.game);

  const samples: TickSample[] = [];
  const tickExecutionMsValues: number[] = [];
  const maxTilesBySmallID = new Map<number, number>();
  let totalIntents = 0;
  const intentsByType: Record<string, number> = {};

  const startedAt = performance.now();
  for (let i = 0; i < opts.turnsToRun.length; i++) {
    const turn = opts.turnsToRun[i];
    totalIntents += turn.intents.length;

    for (const intent of turn.intents as any[]) {
      const t = intent.type ?? "unknown";
      intentsByType[t] = (intentsByType[t] ?? 0) + 1;
    }

    runner.addTurn(turn);
    runner.executeNextTick();

    opts.onAfterTick?.({ game: runner.game, turn, conquestEvents, isLast: i === opts.turnsToRun.length - 1 });

    for (const p of runner.game.allPlayers()) {
      const tiles = p.numTilesOwned();
      const prev = maxTilesBySmallID.get(p.smallID()) ?? 0;
      if (tiles > prev) {
        maxTilesBySmallID.set(p.smallID(), tiles);
      }
    }

    tickExecutionMsValues.push(lastTickExecutionMs);
    const humans = countHumans(opts.openfront, runner.game);
    samples.push({
      turnNumber: turn.turnNumber,
      gameTick: lastGameTick,
      tickExecutionMs: lastTickExecutionMs,
      intents: turn.intents.length,
      ...humans,
    });

    if (i > 0 && opts.progressEvery > 0 && i % opts.progressEvery === 0) {
      const elapsed = performance.now() - startedAt;
      const pct = ((i / opts.turnsToRun.length) * 100).toFixed(1);
      (opts.progressLog ?? console.log)(
        `progress: ${i}/${opts.turnsToRun.length} (${pct}%) | elapsed ${Math.round(elapsed)}ms | last tick ${lastTickExecutionMs.toFixed(3)}ms`,
      );
    }
  }

  const elapsedMs = performance.now() - startedAt;
  return {
    runner,
    elapsedMs,
    samples,
    tickExecutionMsValues,
    totalIntents,
    intentsByType,
    hashesCompared,
    hashMismatches,
    hashMismatchSamples,
    maxTilesBySmallID,
  };
}
