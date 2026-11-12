import assert from "node:assert/strict";
import test from "node:test";
import { crearPromocion } from "../controllers/promocion.controller.js";

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
