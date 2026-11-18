import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "../utils/uploadStorage.js";

const contentTypesByExtension = {
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".jfif": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp"
};

const receiptError = (statusCode, code, message) =>
    Object.assign(new Error(message), { statusCode, code });

const getGitHubConfiguration = () => {
    const directory = (process.env.GITHUB_RECEIPTS_DIRECTORY || "").trim();
    if (!directory) return null;
    const values = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH"]
        .map((key) => (process.env[key] || "").trim());
    if (values.some((value) => !value)) {
        throw receiptError(
            503,
            "RECEIPT_STORAGE_UNAVAILABLE",
            "La configuración de almacenamiento de comprobantes en GitHub está incompleta."
        );
    }

    const [token, owner, repository, branch] = values;
    const normalizedDirectory = directory.replace(/^\/+|\/+$/g, "");
    if (!normalizedDirectory || normalizedDirectory.split("/").some((part) => !part || part === "." || part === "..")) {
        throw receiptError(
            503,
            "RECEIPT_STORAGE_UNAVAILABLE",
            "El directorio de comprobantes de GitHub no es válido."
        );
    }

    return { token, owner, repository, branch, directory: normalizedDirectory };
};

const getReceiptFilename = (reference) => {
    if (typeof reference !== "string" || !reference.trim()) {
        throw receiptError(404, "RECEIPT_NOT_FOUND", "El pedido no tiene un comprobante disponible.");
    }

    const value = reference.trim();
    let referencePath = value;
    if (/^https?:\/\//i.test(value)) {
        try {
            referencePath = new URL(value).pathname;
        } catch {
            throw receiptError(404, "RECEIPT_NOT_FOUND", "No se encontró el comprobante.");
        }
    }

    const filename = path.posix.basename(referencePath.replace(/\\/g, "/").split(/[?#]/, 1)[0]);
    if (!filename || filename === "." || filename === ".." || filename.includes("\0")) {
        throw receiptError(404, "RECEIPT_NOT_FOUND", "No se encontró el comprobante.");
    }

    return filename;
};

const getContentType = (header, filename) => {
    const contentType = String(header || "").split(";")[0].trim().toLowerCase();
    if (contentType.startsWith("image/") && contentType !== "image/svg+xml") return contentType;
    return contentTypesByExtension[path.extname(filename).toLowerCase()] || "application/octet-stream";
};

const getFromGitHub = async (filename, configuration) => {
    const repositoryPath = `${configuration.directory}/${filename}`;
    const encodedPath = repositoryPath.split("/").map(encodeURIComponent).join("/");
    const endpoint = new URL(
        `https://api.github.com/repos/${encodeURIComponent(configuration.owner)}/${encodeURIComponent(configuration.repository)}/contents/${encodedPath}`
    );
    endpoint.searchParams.set("ref", configuration.branch);

    let response;
    try {
        response = await fetch(endpoint, {
            headers: {
                Accept: "application/vnd.github.raw+json",
                Authorization: `Bearer ${configuration.token}`,
                "User-Agent": "Sublime-Gracia-Admin",
                "X-GitHub-Api-Version": "2022-11-28"
            },
            signal: AbortSignal.timeout(15000)
        });
    } catch {
        throw receiptError(502, "RECEIPT_STORAGE_ERROR", "No se pudo consultar el repositorio de comprobantes.");
    }

    if (response.status === 404) return null;
    if (!response.ok) {
        throw receiptError(502, "RECEIPT_STORAGE_ERROR", "GitHub no pudo entregar el comprobante.");
    }

    return {
        filename,
        contentType: getContentType(response.headers.get("content-type"), filename),
        buffer: Buffer.from(await response.arrayBuffer())
    };
};

export const obtenerComprobante = async (reference) => {
    const filename = getReceiptFilename(reference);
    const configuration = getGitHubConfiguration();
    let githubError = null;

    if (configuration) {
        try {
            const receipt = await getFromGitHub(filename, configuration);
            if (receipt) return receipt;
        } catch (error) {
            githubError = error;
        }
    }

    try {
        const buffer = await readFile(path.join(uploadsRoot, "comprobantes", filename));
        return {
            filename,
            contentType: getContentType("", filename),
            buffer
        };
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw receiptError(500, "RECEIPT_STORAGE_ERROR", "No se pudo leer el comprobante local.");
        }
    }

    if (githubError) throw githubError;
    throw receiptError(404, "RECEIPT_NOT_FOUND", "No se encontró el comprobante en GitHub ni en el almacenamiento local.");
};
