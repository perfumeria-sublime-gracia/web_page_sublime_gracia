import assert from "node:assert/strict";
import test from "node:test";
import { crearPromocion, requestData } from "../controllers/promocion.controller.js";

const responseRecorder = () => {
    const response = {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
    return response;
};

test("promotion creation returns a validation error when the request body is missing", async () => {
    const response = responseRecorder();

    await crearPromocion({ body: undefined }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.message, "Los datos de la promoción no son válidos.");
});

test("promotion creation returns a validation error when the name is missing", async () => {
    const response = responseRecorder();

    await crearPromocion({
        body: { tipo: "PORCENTAJE", valor: 10, fechaInicio: "2026-11-12", fechaFin: "2026-11-30" }
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.message, "Los datos de la promoción no son válidos.");
});

test("promotion multipart payload accepts the JSON object and boolean selection flag", () => {
    const request = requestData({
        body: {
            promocion: JSON.stringify({
                nombre: "Promoción de prueba",
                tipo: "PORCENTAJE",
                valor: 10,
                fechaInicio: "2026-11-12",
                fechaFin: "2026-11-30",
                seleccionEspecifica: true,
                productIds: [2, 4],
                presentationIds: [8]
            })
        }
    });

    assert.ok(request);
    assert.equal(request.datos.nombre, "Promoción de prueba");
    assert.equal(request.datos.seleccionEspecifica, true);
    assert.deepEqual(request.productIds, [2, 4]);
    assert.deepEqual(request.presentationIds, [8]);
});

test("promotion multipart fields accept boolean strings from older desktop builds", () => {
    const request = requestData({
        body: {
            nombre: "Promoción de prueba",
            tipo: "PORCENTAJE",
            valor: "10",
            fechaInicio: "2026-11-12",
            fechaFin: "2026-11-30",
            seleccionEspecifica: "true",
            productIds: "[2,4]",
            presentationIds: "[8]"
        }
    });

    assert.ok(request);
    assert.equal(request.datos.seleccionEspecifica, true);
    assert.deepEqual(request.productIds, [2, 4]);
    assert.deepEqual(request.presentationIds, [8]);
});
