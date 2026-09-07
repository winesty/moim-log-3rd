import { promises as fs } from "fs";
import path from "path";
import { JsonBackedProvider } from "./JsonBackedProvider";

const DATA_DIR = path.join(process.cwd(), ".local-data");

export class LocalFileProvider extends JsonBackedProvider {
  protected async readFile<T>(filename: string): Promise<T[]> {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  protected async writeFile<T>(filename: string, data: T[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
  }
}
