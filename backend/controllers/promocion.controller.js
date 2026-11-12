import { Promocion } from "../models/promocion.model.js";
import { Productos } from "../models/products.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { validarPromocion } from "../services/promocion.service.js";
import { guardarImagenPromocion } from "../services/productImageStorage.js";
import db from "../db/connect.js";

const datosPromocion = (body) => ({
    nombre: body.nombre,
    tipo: body.tipo,
    valor: Number(body.valor || 0),
    fechaInicio: body.fechaInicio,
    fechaFin: body.fechaFin,
    activa: body.activa === undefined ? true : body.activa === true || body.activa === "true",
    genero: body.genero || "TODOS",
    prioridad: Number(body.prioridad || 0),
    ...(Object.hasOwn(body, "img") ? { img: body.img || null } : {}),
    ...(Object.hasOwn(body, "seleccionEspecifica")
        ? { seleccionEspecifica: body.seleccionEspecifica === true || body.seleccionEspecifica === "true" }
        : {})
});

const parseBody = (req) => {
    const input = req.body;
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    if (typeof input.promocion !== "string") return input;
    try {
        const body = JSON.parse(input.promocion);
        return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
        return null;
    }
};

const parseIds = (value) => {
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            return null;
        }
    }
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)) return null;
    return [...new Set(value.map(Number))];
};

export const requestData = (req) => {
    const body = parseBody(req);
    if (!body) return null;
    if (typeof body.nombre !== "string" || !body.nombre.trim()) return null;
    if ((Object.hasOwn(body, "img") && body.img !== null && typeof body.img !== "string") ||
        (Object.hasOwn(body, "seleccionEspecifica") &&
            ![true, false, "true", "false"].includes(body.seleccionEspecifica))) return null;
    const datos = datosPromocion(body);
    return {
        datos,
        productIds: parseIds(body.productIds),
        presentationIds: parseIds(body.presentationIds)
    };
};

const asignarProductos = async (promocion, productIds, transaction) => {
    if (!Array.isArray(productIds)) return;
    const productos = await Productos.findAll({ where: { id: productIds }, transaction });
    await promocion.setProductos(productos, { transaction });
};

const asignarPresentaciones = async (promocion, presentationIds, transaction) => {
    if (!Array.isArray(presentationIds)) return;
    const presentaciones = await ProductoPresentacion.findAll({ where: { id: presentationIds }, transaction });
    await promocion.setPresentaciones(presentaciones, { transaction });
};

export const listarPromociones = async (_req, res) => {
    const promociones = await Promocion.findAll({
        include: [{ association: "productos", required: false }, { association: "presentaciones", required: false }],
        order: [["fechaInicio", "DESC"], ["prioridad", "DESC"]]
    });
    res.json(promociones);
};

export const obtenerPromocion = async (req, res) => {
    const promocion = await Promocion.findByPk(req.params.id, {
        include: [{ association: "productos", required: false }, { association: "presentaciones", required: false }]
    });
    if (!promocion) return res.status(404).json({ message: "Promocion no encontrada" });
    res.json(promocion);
};

export const crearPromocion = async (req, res) => {
    const request = requestData(req);
    if (!request || request.productIds === null || request.presentationIds === null) {
        return res.status(400).json({ message: "Los datos de la promoción no son válidos." });
    }
    const { datos, productIds, presentationIds } = request;
    const error = validarPromocion(datos);
    if (error) return res.status(400).json({ message: error });
    if (req.file) datos.img = await guardarImagenPromocion(req.file);
    const transaction = await db.transaction();
    try {
        const promocion = await Promocion.create(datos, { transaction });
        await asignarProductos(promocion, productIds, transaction);
        await asignarPresentaciones(promocion, presentationIds, transaction);
        const result = await Promocion.findByPk(promocion.id, { include: ["productos", "presentaciones"], transaction });
        await transaction.commit();
        res.status(201).json(result);
    } catch (requestError) {
        await transaction.rollback();
        throw requestError;
    }
};

export const actualizarPromocion = async (req, res) => {
    const request = requestData(req);
    if (!request || request.productIds === null || request.presentationIds === null) {
        return res.status(400).json({ message: "Los datos de la promoción no son válidos." });
    }
    const { datos, productIds, presentationIds } = request;
    const error = validarPromocion(datos);
    if (error) return res.status(400).json({ message: error });
    const transaction = await db.transaction();
    try {
        const promocion = await Promocion.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!promocion) {
            await transaction.rollback();
            return res.status(404).json({ message: "Promocion no encontrada" });
        }
        if (req.file) datos.img = await guardarImagenPromocion(req.file);
        await promocion.update(datos, { transaction });
        await asignarProductos(promocion, productIds, transaction);
        await asignarPresentaciones(promocion, presentationIds, transaction);
        const result = await Promocion.findByPk(promocion.id, { include: ["productos", "presentaciones"], transaction });
        await transaction.commit();
        res.json(result);
    } catch (requestError) {
        await transaction.rollback();
        throw requestError;
    }
};

export const cambiarEstadoPromocion = async (req, res) => {
    if (typeof req.body.activa !== "boolean") {
        return res.status(400).json({ message: "El campo activa debe ser booleano." });
    }
    const promocion = await Promocion.findByPk(req.params.id);
    if (!promocion) return res.status(404).json({ message: "Promocion no encontrada" });
    await promocion.update({ activa: req.body.activa });
    res.json(promocion);
};

export const eliminarPromocion = async (req, res) => {
    const promocion = await Promocion.findByPk(req.params.id);
    if (!promocion) return res.status(404).json({ message: "Promocion no encontrada" });
    await promocion.destroy();
    res.json({ message: "Promocion eliminada" });
};