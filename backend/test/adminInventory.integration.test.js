import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import "dotenv/config";
import jwt from "jsonwebtoken";
import db from "../db/connect.js";
import "../models/associations.js";
import { InventarioMovimiento } from "../models/inventarioMovimiento.model.js";
import { Pedido } from "../models/pedido.model.js";
import { PedidoItem } from "../models/pedidoItem.model.js";
import { Promocion } from "../models/promocion.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { Productos } from "../models/products.model.js";
import { Reseñas } from "../models/reseñas.model.js";
import app from "../src/app.js";

test("admin POS sale updates shared stock and order transitions do not deduct it again", {
    skip: process.env.RUN_DB_INTEGRATION_TESTS !== "1" ? "Set RUN_DB_INTEGRATION_TESTS=1 to run against the configured PostgreSQL database." : false,
    timeout: 120_000
}, async () => {
    assert.ok(process.env.JWT_SECRET, "JWT_SECRET is required for the authenticated API test");
    await db.authenticate();

    const transaction = await db.transaction();
    const rollback = transaction.rollback.bind(transaction);
    const originalTransaction = db.transaction.bind(db);
    const originalProductsFindAll = Productos.findAll;
    const originalProductsFindByPk = Productos.findByPk;
    const originalProductReload = Productos.prototype.reload;
    const originalMovementsFindAll = InventarioMovimiento.findAll;
    const originalOrdersFindAll = Pedido.findAll;
    const originalPromotionsFindAll = Promocion.findAll;
    const originalPromotionsFindByPk = Promocion.findByPk;
    const originalProductUpdate = Productos.prototype.update;
    const originalPromotionUpdate = Promocion.prototype.update;
    const originalReviewUpdate = Reseñas.prototype.update;
    const originalReviewDestroy = Reseñas.prototype.destroy;
    const originalReviewsFindAll = Reseñas.findAll;
    const originalReviewsFindByPk = Reseñas.findByPk;
    const originalFetch = globalThis.fetch;
    const server = app.listen(0);

    try {
        await once(server, "listening");
        globalThis.fetch = (input, init = {}) => {
            return originalFetch(input, { ...init, signal: AbortSignal.timeout(15_000) });
        };
        await db.query(`
            ALTER TABLE "pedidos"
            ADD COLUMN IF NOT EXISTS "canalVenta" VARCHAR(20) NOT NULL DEFAULT 'web',
            ADD COLUMN IF NOT EXISTS "metodoPago" VARCHAR(30)
        `, { transaction });
        await db.query(`
            ALTER TABLE "reseñas"
            ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true
        `, { transaction });
        await InventarioMovimiento.sync({ transaction });

        transaction.commit = async () => {};
        transaction.rollback = async () => {};
        db.transaction = async () => transaction;
        Productos.findAll = function (options = {}) {
            return originalProductsFindAll.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Productos.findByPk = function (id, options = {}) {
            return originalProductsFindByPk.call(this, id, { ...options, transaction: options.transaction ?? transaction });
        };
        Productos.prototype.reload = function (options = {}) {
            return originalProductReload.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        InventarioMovimiento.findAll = function (options = {}) {
            return originalMovementsFindAll.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Pedido.findAll = function (options = {}) {
            return originalOrdersFindAll.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Promocion.findAll = function (options = {}) {
            return originalPromotionsFindAll.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Promocion.findByPk = function (id, options = {}) {
            return originalPromotionsFindByPk.call(this, id, { ...options, transaction: options.transaction ?? transaction });
        };
        Productos.prototype.update = function (values, options = {}) {
            return originalProductUpdate.call(this, values, { ...options, transaction: options.transaction ?? transaction });
        };
        Promocion.prototype.update = function (values, options = {}) {
            return originalPromotionUpdate.call(this, values, { ...options, transaction: options.transaction ?? transaction });
        };
        Reseñas.prototype.update = function (values, options = {}) {
            return originalReviewUpdate.call(this, values, { ...options, transaction: options.transaction ?? transaction });
        };
        Reseñas.prototype.destroy = function (options = {}) {
            return originalReviewDestroy.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Reseñas.findAll = function (options = {}) {
            return originalReviewsFindAll.call(this, { ...options, transaction: options.transaction ?? transaction });
        };
        Reseñas.findByPk = function (id, options = {}) {
            return originalReviewsFindByPk.call(this, id, { ...options, transaction: options.transaction ?? transaction });
        };

        const fixture = await Productos.create({
            nombre: `Inventario test ${Date.now()}`,
            marca: "Prueba temporal",
            genero: "UNISEX",
            segmentacion: "Otros",
            categoria: "Otros",
            descripcion: "Fixture de prueba transaccional",
            precio: 10000,
            stock: 10,
            activo: true,
            img: "https://example.invalid/test.png"
        }, { transaction });

        const address = server.address();
        assert.ok(address && typeof address === "object");
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const auth = `Bearer ${jwt.sign({ id: 1, rol: "admin" }, process.env.JWT_SECRET, { expiresIn: "5m" })}`;

        const unauthorized = await fetch(`${baseUrl}/api/admin/dashboard`);
        assert.equal(unauthorized.status, 401, "dashboard must reject unauthenticated requests");

        const createdCatalogResponse = await fetch(`${baseUrl}/api/productos`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: `CRUD test ${Date.now()}`,
                marca: "Prueba temporal",
                genero: "UNISEX",
                segmentacion: "Otros",
                categoria: "Otros",
                descripcion: "Prueba de catálogo",
                precio: 12000,
                stock: 4,
                activo: true,
                img: "https://example.invalid/crud.png",
                presentaciones: [{ mililitros: 30, precio: 12000, stock: 4, activo: true }]
            })
        });
        const createdCatalogText = await createdCatalogResponse.text();
        assert.equal(createdCatalogResponse.status, 201, createdCatalogText);
        const createdCatalog = JSON.parse(createdCatalogText);

        const updateCatalogResponse = await fetch(`${baseUrl}/api/productos/${createdCatalog.id}`, {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: createdCatalog.nombre,
                marca: createdCatalog.marca,
                genero: createdCatalog.genero,
                segmentacion: createdCatalog.segmentacion,
                categoria: createdCatalog.categoria,
                descripcion: "Descripción actualizada",
                precio: 13000,
                stock: 4,
                activo: true,
                img: "https://example.invalid/updated-crud.png",
                presentaciones: [{ ...createdCatalog.presentaciones[0], precio: 13000 }]
            })
        });
        const updatedCatalogText = await updateCatalogResponse.text();
        assert.equal(updateCatalogResponse.status, 200, updatedCatalogText);
        assert.equal(JSON.parse(updatedCatalogText).img, "https://example.invalid/updated-crud.png",
            "catalogue edit must save the new image URL");
        const deleteCatalogResponse = await fetch(`${baseUrl}/api/productos/${createdCatalog.id}`, {
            method: "DELETE",
            headers: { Authorization: auth }
        });
        assert.equal(deleteCatalogResponse.status, 200, await deleteCatalogResponse.text());
        assert.equal((await Productos.findByPk(createdCatalog.id, { transaction })).activo, false,
            "catalogue removal must deactivate rather than break historic order references");

        const today = new Date().toISOString().slice(0, 10);
        const createPromotionResponse = await fetch(`${baseUrl}/api/promociones`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: `Promotion test ${Date.now()}`,
                tipo: "PORCENTAJE",
                valor: 10,
                fechaInicio: today,
                fechaFin: today,
                activa: true,
                genero: "TODOS",
                prioridad: 0,
                productIds: [fixture.id],
                presentationIds: []
            })
        });
        const promotionText = await createPromotionResponse.text();
        assert.equal(createPromotionResponse.status, 201, promotionText);
        const createdPromotion = JSON.parse(promotionText);
        const updatePromotionResponse = await fetch(`${baseUrl}/api/promociones/${createdPromotion.id}`, {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: createdPromotion.nombre,
                tipo: "MONTO",
                valor: 1000,
                fechaInicio: today,
                fechaFin: today,
                activa: true,
                genero: "TODOS",
                prioridad: 1,
                productIds: [fixture.id],
                presentationIds: []
            })
        });
        assert.equal(updatePromotionResponse.status, 200, await updatePromotionResponse.text());
        const promotionStateResponse = await fetch(`${baseUrl}/api/promociones/${createdPromotion.id}/estado`, {
            method: "PATCH",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ activa: false })
        });
        assert.equal(promotionStateResponse.status, 200, await promotionStateResponse.text());

        const testReview = await Reseñas.create({
            productoId: fixture.id,
            nombre: "Opinión temporal",
            opinion: "Prueba de moderación",
            calificacion: 5,
            activa: true
        }, { transaction });
        const reviewStateResponse = await fetch(`${baseUrl}/api/admin/opiniones/${testReview.id}/estado`, {
            method: "PATCH",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ activa: false })
        });
        assert.equal(reviewStateResponse.status, 200, await reviewStateResponse.text());
        let publicReviews = await fetch(`${baseUrl}/api/opiniones?productoId=${fixture.id}`).then((response) => response.json());
        assert.equal(publicReviews.length, 0, "hidden opinions must not appear on the public store");
        const approveReviewResponse = await fetch(`${baseUrl}/api/admin/opiniones/${testReview.id}/estado`, {
            method: "PATCH",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ activa: true })
        });
        assert.equal(approveReviewResponse.status, 200, await approveReviewResponse.text());
        publicReviews = await fetch(`${baseUrl}/api/opiniones?productoId=${fixture.id}`).then((response) => response.json());
        assert.equal(publicReviews.length, 1, "approved opinions must appear on the public store");
        const removeReviewResponse = await fetch(`${baseUrl}/api/admin/opiniones/${testReview.id}`, {
            method: "DELETE",
            headers: { Authorization: auth }
        });
        assert.equal(removeReviewResponse.status, 200, await removeReviewResponse.text());

        const moduleEndpoints = [
            "/api/admin/productos",
            "/api/admin/pedidos",
            "/api/admin/inventario/movimientos",
            "/api/admin/dashboard",
            "/api/admin/clientes",
            "/api/admin/opiniones",
            "/api/promociones"
        ];
        for (const endpoint of moduleEndpoints) {
            const response = await fetch(`${baseUrl}${endpoint}`, { headers: { Authorization: auth } });
            assert.equal(response.status, 200, `${endpoint} should be available to an administrator`);
        }

        const activatePromotionResponse = await fetch(`${baseUrl}/api/promociones/${createdPromotion.id}/estado`, {
            method: "PATCH",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ activa: true })
        });
        assert.equal(activatePromotionResponse.status, 200, await activatePromotionResponse.text());

        const receiptResponse = await fetch(`${baseUrl}/api/admin/inventario/movimientos`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ productId: fixture.id, operation: "entrada", quantity: 3 })
        });
        assert.equal(receiptResponse.status, 201, await receiptResponse.text());
        let currentProduct = await Productos.findByPk(fixture.id, { transaction });
        assert.equal(currentProduct.stock, 13, "inventory receipt must increase stock in PostgreSQL");
        const adjustmentResponse = await fetch(`${baseUrl}/api/admin/inventario/movimientos`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                productId: fixture.id,
                operation: "ajuste",
                quantity: 3,
                direction: -1,
                motivo: "Revertir la entrada temporal para probar"
            })
        });
        assert.equal(adjustmentResponse.status, 201, await adjustmentResponse.text());
        currentProduct = await Productos.findByPk(fixture.id, { transaction });
        assert.equal(currentProduct.stock, 10, "inventory adjustment must restore the fixture quantity");

        const saleResponse = await fetch(`${baseUrl}/api/admin/ventas-presenciales`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({
                metodoPago: "Efectivo",
                items: [{ productId: fixture.id, quantity: 2 }]
            })
        });
        const saleText = await saleResponse.text();
        assert.equal(saleResponse.status, 201, saleText);
        const sale = JSON.parse(saleText);
        assert.equal(Number(sale.pedido.total), 18000, "in-person sales must apply the active promotion");

        currentProduct = await Productos.findByPk(fixture.id, { transaction });
        assert.equal(currentProduct.stock, 8, "POS sale must decrement exactly two units");

        const publicResponse = await fetch(`${baseUrl}/api/productos`);
        assert.equal(publicResponse.status, 200);
        const publicProducts = await publicResponse.json();
        assert.equal(publicProducts.find((product) => product.id === fixture.id)?.stock, 8,
            "public web catalog must report the same stock as PostgreSQL");

        const saleMovement = await InventarioMovimiento.findOne({
            where: { pedidoId: sale.pedido.id, tipo: "venta_presencial" },
            transaction
        });
        assert.ok(saleMovement);
        assert.equal(saleMovement.cantidad, -2);
        assert.equal(saleMovement.stockAnterior, 10);
        assert.equal(saleMovement.stockNuevo, 8);

        const webOrder = await Pedido.create({
            nombre: "Fixture de pedido web",
            telefono: "000",
            email: "fixture@example.invalid",
            direccion: "Prueba",
            ciudad: "Prueba",
            total: 10000,
            estado: "pendiente",
            canalVenta: "web"
        }, { transaction });
        await PedidoItem.create({
            pedidoId: webOrder.id,
            productId: fixture.id,
            cantidad: 1,
            precio: 10000,
            nombreProducto: fixture.nombre
        }, { transaction });
        await currentProduct.decrement("stock", { by: 1, transaction });
        await InventarioMovimiento.create({
            productoId: fixture.id,
            pedidoId: webOrder.id,
            tipo: "venta_web",
            cantidad: -1,
            stockAnterior: 8,
            stockNuevo: 7
        }, { transaction });

        for (const estado of ["pagado", "preparando"]) {
            const stateResponse = await fetch(`${baseUrl}/api/admin/pedidos/${webOrder.id}/estado`, {
                method: "PUT",
                headers: { Authorization: auth, "Content-Type": "application/json" },
                body: JSON.stringify({ estado })
            });
            assert.equal(stateResponse.status, 200, await stateResponse.text());
            currentProduct = await Productos.findByPk(fixture.id, { transaction });
            assert.equal(currentProduct.stock, 7, `changing order status to ${estado} must not deduct stock again`);
        }

        const rejectResponse = await fetch(`${baseUrl}/api/admin/pedidos/${webOrder.id}/estado`, {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "rechazado", comentarioCancelacion: "Fixture de prueba" })
        });
        assert.equal(rejectResponse.status, 200, await rejectResponse.text());
        const repeatedRejectResponse = await fetch(`${baseUrl}/api/admin/pedidos/${webOrder.id}/estado`, {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "rechazado", comentarioCancelacion: "Fixture de prueba" })
        });
        assert.equal(repeatedRejectResponse.status, 200, await repeatedRejectResponse.text());
        currentProduct = await Productos.findByPk(fixture.id, { transaction });
        assert.equal(currentProduct.stock, 8, "rejecting the same order twice must restore only once");
        assert.equal(await InventarioMovimiento.count({
            where: { pedidoId: webOrder.id, tipo: "pedido_reintegro" },
            transaction
        }), 1);
        const customerOrdersResponse = await fetch(`${baseUrl}/api/admin/clientes/fixture%40example.invalid/pedidos`, {
            headers: { Authorization: auth }
        });
        assert.equal(customerOrdersResponse.status, 200);
        assert.equal((await customerOrdersResponse.json()).length, 1, "customer order history endpoint should return its real orders");
    } finally {
        db.transaction = originalTransaction;
        globalThis.fetch = originalFetch;
        Productos.findAll = originalProductsFindAll;
        Productos.findByPk = originalProductsFindByPk;
        Productos.prototype.reload = originalProductReload;
        InventarioMovimiento.findAll = originalMovementsFindAll;
        Pedido.findAll = originalOrdersFindAll;
        Promocion.findAll = originalPromotionsFindAll;
        Promocion.findByPk = originalPromotionsFindByPk;
        Productos.prototype.update = originalProductUpdate;
        Promocion.prototype.update = originalPromotionUpdate;
        Reseñas.prototype.update = originalReviewUpdate;
        Reseñas.prototype.destroy = originalReviewDestroy;
        Reseñas.findAll = originalReviewsFindAll;
        Reseñas.findByPk = originalReviewsFindByPk;
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        if (!transaction.finished) await rollback();
        await db.close();
    }
});
