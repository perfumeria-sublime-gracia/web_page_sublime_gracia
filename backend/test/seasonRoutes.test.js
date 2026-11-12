import test from "node:test";
import assert from "node:assert/strict";

process.env.DATA_BASE_URL ??= "postgres://user:password@127.0.0.1:5432/testdb";

const { default: apiRouter } = await import("../routes/api/index.api.js");

test("public active-season endpoint is mounted before the blanket admin guard", () => {
    const layers = apiRouter.stack;
    const seasonsIndex = layers.findIndex((layer) =>
        layer.handle.stack?.some((child) => child.route?.path === "/temporadas/activa")
    );
    const blanketAdminIndex = layers.findIndex((layer) =>
        layer.handle.stack?.some((child) => !child.route && child.name === "verifyToken")
    );

    assert.notEqual(seasonsIndex, -1, "The season router must be mounted");
    assert.notEqual(blanketAdminIndex, -1, "The admin authentication guard must be mounted");
    assert.ok(seasonsIndex < blanketAdminIndex, "Public season lookup must not be intercepted by admin authentication");

    const publicRoute = layers[seasonsIndex].handle.stack.find((child) =>
        child.route?.path === "/temporadas/activa"
    );
    const protectedRoutes = layers[seasonsIndex].handle.stack.filter((child) =>
        child.route?.path?.startsWith("/admin/temporadas")
    );
    assert.equal(publicRoute.route.stack.some((handler) => handler.name === "verifyToken"), false);
    assert.ok(protectedRoutes.every((route) =>
        route.route.stack.some((handler) => handler.name === "verifyToken")
    ));
});
