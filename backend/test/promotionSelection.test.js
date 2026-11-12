import assert from "node:assert/strict";
import test from "node:test";
import { calcularPrecioPromocional } from "../services/promocion.service.js";

const promotion = {
    tipo: "PORCENTAJE",
    valor: 20,
    genero: "TODOS",
    prioridad: 0,
    seleccionEspecifica: true,
    productos: [{ id: 1 }],
    presentaciones: [{ id: 11 }]
};

test("specific promotion selection requires both the selected product and presentation", () => {
    const selected = calcularPrecioPromocional({
        id: 1,
        genero: "UNISEX",
        precio: 1000,
        presentacion: { id: 11, precio: 1000 }
    }, 1, [promotion]);
    const otherProduct = calcularPrecioPromocional({
        id: 2,
        genero: "UNISEX",
        precio: 1000,
        presentacion: { id: 11, precio: 1000 }
    }, 1, [promotion]);
    const otherPresentation = calcularPrecioPromocional({
        id: 1,
        genero: "UNISEX",
        precio: 1000,
        presentacion: { id: 12, precio: 1000 }
    }, 1, [promotion]);

    assert.equal(selected.totalFinal, 800);
    assert.equal(otherProduct.totalFinal, 1000);
    assert.equal(otherPresentation.totalFinal, 1000);
});

test("a specific product with no presentation restriction includes all its presentations", () => {
    const allPresentations = {
        ...promotion,
        presentaciones: []
    };
    const result = calcularPrecioPromocional({
        id: 1,
        genero: "UNISEX",
        precio: 1000,
        presentacion: { id: 12, precio: 1500 }
    }, 1, [allPresentations]);

    assert.equal(result.totalFinal, 1200);
});

test("legacy promotions without specific selection continue to apply globally", () => {
    const legacy = { ...promotion, seleccionEspecifica: false, productos: [], presentaciones: [] };
    const result = calcularPrecioPromocional({
        id: 2,
        genero: "UNISEX",
        precio: 1000,
        presentacion: { id: 99, precio: 1000 }
    }, 1, [legacy]);

    assert.equal(result.totalFinal, 800);
});
