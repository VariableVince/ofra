import path from "node:path";
import { pathToFileURL } from "node:url";

export type OpenFrontRuntime = {
  Schemas: {
    GameRecordSchema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } };
    PartialGameRecordSchema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } };
  };
  Game: {
    PlayerType: Record<string, unknown>;
    UnitType: Record<string, unknown>;
    GameMapType: Record<string, unknown>;
  };
  GameUpdates: {
    GameUpdateType: Record<string, unknown>;
  };
  GameRunner: {
    createGameRunner: (...args: any[]) => any;
  };
};

async function importFromGameRoot<T>(gameRoot: string, relPath: string): Promise<T> {
  const abs = path.resolve(gameRoot, relPath);
  return (await import(pathToFileURL(abs).href)) as T;
}

async function importFirst<T>(gameRoot: string, relPaths: string[]): Promise<T> {
  let lastErr: unknown = null;
  for (const relPath of relPaths) {
    try {
      return await importFromGameRoot<T>(gameRoot, relPath);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Failed to import any of: ${relPaths.join(", ")}`);
}

export async function loadOpenFrontRuntime(gameRoot: string): Promise<OpenFrontRuntime> {
  const Schemas = await importFirst<any>(gameRoot, ["src/core/Schemas.ts", "src/core/Schemas.js"]);
  const Game = await importFirst<any>(gameRoot, ["src/core/game/Game.ts", "src/core/game/Game.js"]);
  const GameUpdates = await importFirst<any>(gameRoot, [
    "src/core/game/GameUpdates.ts",
    "src/core/game/GameUpdates.js",
  ]);
  const GameRunner = await importFirst<any>(gameRoot, ["src/core/GameRunner.ts", "src/core/GameRunner.js"]);

  if (!Schemas?.GameRecordSchema || !Schemas?.PartialGameRecordSchema) {
    throw new Error(`OpenFront Schemas module missing expected exports at ${path.resolve(gameRoot, "src/core/Schemas")}`);
  }
  if (!Game?.PlayerType || !Game?.UnitType || !Game?.GameMapType) {
    throw new Error(`OpenFront Game module missing expected exports at ${path.resolve(gameRoot, "src/core/game/Game")}`);
  }
  if (!GameUpdates?.GameUpdateType) {
    throw new Error(
      `OpenFront GameUpdates module missing expected exports at ${path.resolve(gameRoot, "src/core/game/GameUpdates")}`,
    );
  }
  if (!GameRunner?.createGameRunner) {
    throw new Error(`OpenFront GameRunner module missing expected exports at ${path.resolve(gameRoot, "src/core/GameRunner")}`);
  }

  return { Schemas, Game, GameUpdates, GameRunner };
}

