import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "../utils/uploadStorage.js";
import { productImageFormats } from "../utils/productImageFormats.js";

const imageSignatures = {
    ".avif": (buffer) => buffer.subarray(4, 12).toString("ascii").startsWith("ftyp") && /avis|avif/.test(buffer.subarray(8, 16).toString("ascii")),
    ".gif": (buffer) => /^GIF8[79]a/.test(buffer.subarray(0, 6).toString("ascii")),
    ".jfif": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    ".jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    ".jpg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    ".png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ".webp": (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
};

const githubEnvironmentKeys = [
    "GITHUB_TOKEN",
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_BRANCH",
    "GITHUB_IMAGES_DIRECTORY"
];

const storageError = (statusCode, code, message) =>
    Object.assign(new Error(message), { statusCode, code });

const getGitHubConfiguration = () => {
    const values = githubEnvironmentKeys.map((key) => (process.env[key] || "").trim());
    if (values.every((value) => !value)) return null;
    if (values.some((value) => !value)) {
        throw storageError(
            503,
            "IMAGE_STORAGE_UNAVAILABLE",
            "La configuración de almacenamiento de imágenes en GitHub está incompleta."
        );
    }

    const [token, owner, repository, branch, directory] = values;
    const normalizedDirectory = directory.replace(/^\/+|\/+$/g, "");
    if (!normalizedDirectory || normalizedDirectory.split("/").some((part) => !part || part === "." || part === "..")) {
        throw storageError(503, "IMAGE_STORAGE_UNAVAILABLE", "El directorio de imágenes de GitHub no es válido.");
    }

    return { token, owner, repository, branch, directory: normalizedDirectory };
};

const validateImage = (file) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const signature = imageSignatures[extension];
    if (!signature || file.mimetype !== productImageFormats[extension]) {
        throw storageError(
            400,
            "INVALID_PRODUCT_IMAGE",
            "Formato no permitido. Usa una imagen PNG, JPG, JPEG, JFIF, GIF, WEBP o AVIF."
        );
    }

    if (!Buffer.isBuffer(file.buffer) || !signature(file.buffer)) {
        throw storageError(400, "INVALID_PRODUCT_IMAGE", "El contenido del archivo no coincide con una imagen válida.");
    }

    return extension;
};

const saveToGitHub = async (file, extension, configuration, prefix) => {
    const filename = `${prefix}-${Date.now()}-${randomUUID()}${extension}`;
    const repositoryPath = `${configuration.directory}/${filename}`;
    const endpointPath = repositoryPath.split("/").map(encodeURIComponent).join("/");
    const endpoint = `https://api.github.com/repos/${encodeURIComponent(configuration.owner)}/${encodeURIComponent(configuration.repository)}/contents/${endpointPath}`;

    let response;
    try {
        response = await fetch(endpoint, {
            method: "PUT",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${configuration.token}`,
                "Content-Type": "application/json",
                "User-Agent": "Sublime-Gracia-Image-Storage",
                "X-GitHub-Api-Version": "2022-11-28"
            },
            body: JSON.stringify({
                message: `Add product image ${filename}`,
                content: file.buffer.toString("base64"),
                branch: configuration.branch
            }),
            signal: AbortSignal.timeout(15000)
        });
    } catch {
        throw storageError(502, "IMAGE_STORAGE_ERROR", "No se pudo conectar con GitHub para guardar la imagen.");
    }

    if (!response.ok) {
        const message = response.status === 401 || response.status === 403
            ? "GitHub rechazó la subida. Verifica el token y sus permisos de escritura en el repositorio."
            : response.status === 404
                ? "GitHub no encontró el repositorio o la rama configurados."
                : "GitHub no pudo guardar la imagen. Verifica la configuración del repositorio y vuelve a intentarlo.";
        throw storageError(502, "IMAGE_STORAGE_ERROR", message);
    }

    const result = await response.json().catch(() => null);
    const publicUrl = result?.content?.download_url;
    if (typeof publicUrl !== "string" || !publicUrl.startsWith("https://raw.githubusercontent.com/")) {
        throw storageError(502, "IMAGE_STORAGE_ERROR", "GitHub no devolvió una URL pública válida para la imagen.");
    }

    return publicUrl;
};

const guardarImagen = async (file, directory, prefix) => {
    if (!file) throw storageError(400, "INVALID_PRODUCT_IMAGE", "Debes seleccionar una imagen.");
    const extension = validateImage(file);
    const configuration = getGitHubConfiguration();

    if (configuration) return saveToGitHub(file, extension, configuration, prefix);

    const filename = `${prefix}-${Date.now()}-${randomUUID()}${extension}`;
    const destination = path.join(uploadsRoot, directory, filename);
    try {
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, file.buffer, { flag: "wx" });
    } catch {
        throw storageError(503, "IMAGE_STORAGE_UNAVAILABLE", "No se pudo guardar la imagen en el almacenamiento local.");
    }

    return `/uploads/${directory}/${filename}`;
};

export const guardarImagenProducto = (file) => guardarImagen(file, "productos", "producto");
export const guardarImagenPromocion = (file) => guardarImagen(file, "promociones", "promocion");
