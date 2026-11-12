import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const uploadsRoot = path.resolve(
    process.env.UPLOADS_DIR || path.join(backendRoot, "uploads")
);

for (const directory of ["comprobantes", "productos", "promociones"]) {
    mkdirSync(path.join(uploadsRoot, directory), { recursive: true });
}
