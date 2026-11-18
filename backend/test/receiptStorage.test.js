import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { once } from "node:events";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { Pedido } from "../models/pedido.model.js";
import adminPedidoRoutes from "../routes/api/adminPedidoRoutes.js";
import { obtenerComprobante } from "../services/receiptStorage.js";
import { uploadsRoot } from "../utils/uploadStorage.js";

const githubKeys = [
    "GITHUB_TOKEN",
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_BRANCH",
    "GITHUB_RECEIPTS_DIRECTORY"
];
const originalEnvironment = Object.fromEntries(githubKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalJwtSecret = process.env.JWT_SECRET;
const originalPedidoFindByPk = Pedido.findByPk;
const receiptFilename = "comprobante-test-receipt.jpg";
const localReceiptPath = path.join(uploadsRoot, "comprobantes", receiptFilename);

const configureGitHub = () => {
    process.env.GITHUB_TOKEN = "private-test-token";
    process.env.GITHUB_OWNER = "store-owner";
    process.env.GITHUB_REPO = "private-receipts";
    process.env.GITHUB_BRANCH = "main";
    process.env.GITHUB_RECEIPTS_DIRECTORY = "comprobantes";
};

beforeEach(async () => {
    for (const key of githubKeys) delete process.env[key];
    await mkdir(path.dirname(localReceiptPath), { recursive: true });
    await unlink(localReceiptPath).catch(() => {});
});

afterEach(async () => {
    globalThis.fetch = originalFetch;
    for (const key of githubKeys) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
    }
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    Pedido.findByPk = originalPedidoFindByPk;
    await unlink(localReceiptPath).catch(() => {});
});

test("retrieves a receipt through authenticated GitHub content without exposing its credentials", async () => {
    configureGitHub();
    const contents = Buffer.from("github receipt bytes");
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url: String(url), options };
        return new Response(contents, { headers: { "content-type": "image/jpeg" } });
    };

    const receipt = await obtenerComprobante(`/uploads/comprobantes/${receiptFilename}`);

    assert.equal(request.options.headers.Authorization, "Bearer private-test-token");
    assert.match(request.url, /\/contents\/comprobantes\/comprobante-test-receipt\.jpg\?ref=main$/);
    assert.deepEqual(receipt.buffer, contents);
    assert.equal(receipt.contentType, "image/jpeg");
    assert.equal(JSON.stringify(receipt).includes("private-test-token"), false);
});

test("uses a local receipt when GitHub is not configured", async () => {
    const contents = Buffer.from("local receipt bytes");
    await writeFile(localReceiptPath, contents);

    const receipt = await obtenerComprobante(`/uploads/comprobantes/${receiptFilename}`);

    assert.deepEqual(receipt.buffer, contents);
    assert.equal(receipt.contentType, "image/jpeg");
});

test("falls back to a local receipt when GitHub does not contain it", async () => {
    configureGitHub();
    const contents = Buffer.from("local fallback bytes");
    await writeFile(localReceiptPath, contents);
    globalThis.fetch = async () => new Response(null, { status: 404 });

    const receipt = await obtenerComprobante(`/uploads/comprobantes/${receiptFilename}`);

    assert.deepEqual(receipt.buffer, contents);
});

test("returns a not-found error when the receipt is absent from GitHub and local storage", async () => {
    configureGitHub();
    globalThis.fetch = async () => new Response(null, { status: 404 });

    await assert.rejects(
        obtenerComprobante(`/uploads/comprobantes/${receiptFilename}`),
        (error) => error.statusCode === 404 && error.code === "RECEIPT_NOT_FOUND"
    );
});

test("does not fall back silently when GitHub configuration is incomplete", async () => {
    process.env.GITHUB_TOKEN = "private-test-token";
    process.env.GITHUB_RECEIPTS_DIRECTORY = "comprobantes";
    let fetchCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("Unexpected GitHub request");
    };

    await assert.rejects(
        obtenerComprobante(`/uploads/comprobantes/${receiptFilename}`),
        (error) => error.statusCode === 503 && error.code === "RECEIPT_STORAGE_UNAVAILABLE"
    );
    assert.equal(fetchCalled, false);
});

test("serves receipt bytes only through the authenticated administrator endpoint", async () => {
    const secret = "receipt-route-test-secret-with-enough-length";
    const contents = Buffer.from("private github receipt");
    const receiptId = "receipt-order-id";
    process.env.JWT_SECRET = secret;
    configureGitHub();
    Pedido.findByPk = async (id) => id === receiptId
        ? { id, comprobante: `/uploads/comprobantes/${receiptFilename}` }
        : null;

    globalThis.fetch = async (url, options) => {
        if (String(url).startsWith("https://api.github.com/")) {
            assert.equal(options.headers.Authorization, "Bearer private-test-token");
            return new Response(contents, { headers: { "content-type": "image/jpeg" } });
        }
        return originalFetch(url, options);
    };

    const app = express();
    app.use("/", adminPedidoRoutes);
    const server = app.listen(0, "127.0.0.1");

    try {
        await once(server, "listening");
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/admin/pedidos/${receiptId}/comprobante`;
        const unauthorized = await originalFetch(url);
        assert.equal(unauthorized.status, 401);

        const userToken = jwt.sign({ id: "user-id", rol: "user" }, secret);
        const forbidden = await originalFetch(url, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert.equal(forbidden.status, 403);

        const adminToken = jwt.sign({ id: "admin-id", rol: "admin" }, secret);
        const response = await originalFetch(url, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "image/jpeg");
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), contents);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
