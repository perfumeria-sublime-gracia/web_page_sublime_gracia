import assert from "node:assert/strict";
import test from "node:test";
import Sequelize from "sequelize";
import { getAllProducts } from "../controllers/catalogo.controller.js";
import { Productos } from "../models/products.model.js";
import { Promocion } from "../models/promocion.model.js";

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

test("catalog search uses a trimmed, case-insensitive prefix and keeps filters and pagination", async () => {
    const originalFindAll = Productos.findAll;
    const originalCount = Productos.count;
    const originalPromotionsFindAll = Promocion.findAll;
    const findAllOptions = [];
    let response;

    Productos.findAll = async (options) => {
        findAllOptions.push(options);
        return [];
    };
    Productos.count = async () => 45;
    Promocion.findAll = async () => [];

    try {
        response = responseRecorder();
        await getAllProducts({
            query: {
                busqueda: " SO ",
                categoria: "Perfumes",
                genero: "mujer",
                pagina: "2"
            }
        }, response);
    } finally {
        Productos.findAll = originalFindAll;
        Productos.count = originalCount;
        Promocion.findAll = originalPromotionsFindAll;
    }

    const where = findAllOptions[0].where;
    assert.equal(where.nombre[Sequelize.Op.iLike], "SO%");
    assert.equal(where.segmentacion, "Perfumes");
    assert.equal(where.genero, "MUJER");
    assert.deepEqual(where[Sequelize.Op.or], [{ activo: true }, { activo: null }]);
    assert.equal(findAllOptions[0].limit, 20);
    assert.equal(findAllOptions[0].offset, 20);
    assert.equal(response.payload.hayMas, true);
});

test("catalog search escapes LIKE wildcards to preserve literal starts-with matching", async () => {
    const originalFindAll = Productos.findAll;
    const originalCount = Productos.count;
    const originalPromotionsFindAll = Promocion.findAll;
    let searchCondition;

    Productos.findAll = async (options) => {
        if (options.include) searchCondition = options.where.nombre[Sequelize.Op.iLike];
        return [];
    };
    Productos.count = async () => 0;
    Promocion.findAll = async () => [];

    try {
        await getAllProducts({ query: { busqueda: "so_%\\" } }, responseRecorder());
    } finally {
        Productos.findAll = originalFindAll;
        Productos.count = originalCount;
        Promocion.findAll = originalPromotionsFindAll;
    }

    assert.equal(searchCondition, "so\\_\\%\\\\%");
});
