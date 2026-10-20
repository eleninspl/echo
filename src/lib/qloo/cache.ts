import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ResponseCache = {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
};

export function fileCache(dir = path.join(process.cwd(), ".cache", "qloo")): ResponseCache {
  const fileFor = (key: string) =>
    path.join(dir, `${createHash("sha256").update(key).digest("hex")}.json`);

  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(fileFor(key), "utf8"));
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      await mkdir(dir, { recursive: true });
      await writeFile(fileFor(key), JSON.stringify(value));
    },
  };
}
