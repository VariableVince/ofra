import fs from "node:fs/promises";
import path from "node:path";

type LazyLoader<T> = () => Promise<T>;

export class FileSystemGameMapLoader {
  private readonly maps = new Map<any, any>();

  constructor(
    private readonly mapsRoot: string,
    private readonly GameMapType: Record<string, unknown>,
  ) {}

  getMapData(map: any): any {
    const cached = this.maps.get(map);
    if (cached) {
      return cached;
    }

    const dirName = this.mapDirName(map);
    const baseDir = path.join(this.mapsRoot, dirName);

    const lazy = <T>(load: () => Promise<T>): LazyLoader<T> => {
      let cachedPromise: Promise<T> | null = null;
      return () => {
        cachedPromise ??= load();
        return cachedPromise;
      };
    };

    const readBin = (fileName: string) =>
      lazy(async () => {
        const buf = await fs.readFile(path.join(baseDir, fileName));
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      });

    const readJson = <T>(fileName: string) =>
      lazy(async () => {
        const text = await fs.readFile(path.join(baseDir, fileName), "utf8");
        return JSON.parse(text) as T;
      });

    const mapData = {
      mapBin: readBin("map.bin"),
      map4xBin: readBin("map4x.bin"),
      map16xBin: readBin("map16x.bin"),
      manifest: readJson<any>("manifest.json"),
      webpPath: lazy(async () => path.join(baseDir, "thumbnail.webp")),
    };

    this.maps.set(map, mapData);
    return mapData;
  }

  private mapDirName(map: any): string {
    const key = Object.keys(this.GameMapType).find(
      (k) => (this.GameMapType as any)[k] === map,
    );
    if (!key) {
      throw new Error(`Unknown map: ${map}`);
    }
    return key.toLowerCase();
  }
}
