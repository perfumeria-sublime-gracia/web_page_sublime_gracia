import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { guardarImagenProducto, guardarImagenPromocion } from "../services/productImageStorage.js";
import { uploadsRoot } from "../utils/uploadStorage.js";

const githubKeys = [
    "GITHUB_TOKEN",
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_BRANCH",
    "GITHUB_IMAGES_DIRECTORY"
];
const originalEnvironment = Object.fromEntries(githubKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const imageFile = { originalname: "perfume.png", mimetype: "image/png", buffer: png };

beforeEach(() => {
    for (const key of githubKeys) delete process.env[key];
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const key of githubKeys) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
    }
});

test("uploads an image through GitHub and returns its public URL", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_OWNER = "store-owner";
    process.env.GITHUB_REPO = "store-images";
    process.env.GITHUB_BRANCH = "main";
    process.env.GITHUB_IMAGES_DIRECTORY = "imagenes/productos";
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            json: async () => ({
                content: { download_url: "https://raw.githubusercontent.com/store-owner/store-images/main/imagenes/productos/image.png" }
            })
        };
    };

    const url = await guardarImagenProducto(imageFile);

    assert.equal(url, "https://raw.githubusercontent.com/store-owner/store-images/main/imagenes/productos/image.png");
    assert.match(request.url, /^https:\/\/api\.github\.com\/repos\/store-owner\/store-images\/contents\/imagenes\/productos\//);
    assert.equal(request.options.method, "PUT");
    assert.equal(request.options.headers.Authorization, "Bearer test-token");
    assert.equal(JSON.parse(request.options.body).content, png.toString("base64"));
    assert.equal(JSON.parse(request.options.body).branch, "main");
});

test("returns a safe error when GitHub rejects an upload", async () => {
    process.env.GITHUB_TOKEN = "do-not-expose-this-token";
    process.env.GITHUB_OWNER = "store-owner";
    process.env.GITHUB_REPO = "store-images";
    process.env.GITHUB_BRANCH = "main";
    process.env.GITHUB_IMAGES_DIRECTORY = "imagenes/productos";
    globalThis.fetch = async () => ({ ok: false, status: 403 });

    await assert.rejects(
        guardarImagenProducto(imageFile),
        (error) => error.statusCode === 502
            && error.message.includes("permisos")
            && !error.message.includes("do-not-expose-this-token")
    );
});

test("rejects a file whose contents do not match its image extension", async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("Unexpected network call");
    };

    await assert.rejects(
        guardarImagenProducto({ ...imageFile, buffer: Buffer.from("not an image") }),
        (error) => error.statusCode === 400 && error.code === "INVALID_PRODUCT_IMAGE"
    );
    assert.equal(fetchCalled, false);
});

test("uses local storage when GitHub settings are absent", async () => {
    const url = await guardarImagenProducto(imageFile);
    const filename = path.basename(url);
    const destination = path.join(uploadsRoot, "productos", filename);
    try {
        assert.match(url, /^\/uploads\/productos\/producto-/);
    } finally {
        await unlink(destination);
    }
});

test("stores promotional images in their persistent upload directory", async () => {
    const url = await guardarImagenPromocion(imageFile);
    const filename = path.basename(url);
    const destination = path.join(uploadsRoot, "promociones", filename);
    try {
        assert.match(url, /^\/uploads\/promociones\/promocion-/);
    } finally {
        await unlink(destination);
    }
});

test("does not fall back to local storage when GitHub settings are incomplete", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    globalThis.fetch = async () => {
        throw new Error("GitHub must not be called with incomplete configuration");
    };

    await assert.rejects(
        guardarImagenProducto(imageFile),
        (error) => error.statusCode === 503 && error.code === "IMAGE_STORAGE_UNAVAILABLE"
    );
});
