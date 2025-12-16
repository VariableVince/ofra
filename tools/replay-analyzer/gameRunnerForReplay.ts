import { ensureEnvFetchShim } from "./envShim";
import { FileSystemGameMapLoader } from "./FileSystemGameMapLoader";
import type { OpenFrontRuntime } from "./openfrontLoader";

export async function createGameRunnerForReplay(
  openfront: OpenFrontRuntime,
  gameStart: any,
  clientID: string,
  gameUpdate: (gu: any) => void,
  mapsRoot: string,
): Promise<any> {
  ensureEnvFetchShim();
  const mapLoader = new FileSystemGameMapLoader(mapsRoot, openfront.Game.GameMapType);
  return await openfront.GameRunner.createGameRunner(gameStart, clientID, mapLoader, gameUpdate);
}
