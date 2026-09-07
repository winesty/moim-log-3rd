import { StorageProvider } from "./StorageProvider";
import { GoogleDriveProvider } from "./GoogleDriveProvider";
import { LocalFileProvider } from "./LocalFileProvider";

export type { StorageProvider } from "./StorageProvider";

let instance: StorageProvider | null = null;
let initPromise: Promise<void> | null = null;

function createProvider(): StorageProvider {
  const kind = process.env.STORAGE_PROVIDER ?? "local";
  switch (kind) {
    case "google-drive":
      return new GoogleDriveProvider();
    case "local":
      return new LocalFileProvider();
    default:
      throw new Error(`알 수 없는 STORAGE_PROVIDER: ${kind}`);
  }
}

export async function getStorage(): Promise<StorageProvider> {
  if (!instance) {
    instance = createProvider();
    initPromise = instance.init();
  }
  await initPromise;
  return instance;
}
