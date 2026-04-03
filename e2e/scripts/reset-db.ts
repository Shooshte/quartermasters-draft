import { resetWorkerDb } from "../tests/helpers/worker-db";

const dbName = process.argv[2] ?? "qd_worker_0";

try {
  await resetWorkerDb(dbName);
  console.log(`[reset-db] Restored ${dbName}`);
} catch (error) {
  console.error(`[reset-db] Failed to restore ${dbName}`);
  console.error(error);
  process.exit(1);
}
