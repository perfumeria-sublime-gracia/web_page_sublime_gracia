import { Promocion } from "../models/promocion.model.js";
import { Productos } from "../models/products.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { validarPromocion } from "../services/promocion.service.js";
import db from "../db/connect.js";

const datosPromocion = (body) => ({
    nombre: body.nombre,
    tipo: body.tipo,
    valor: Number(body.valor || 0),
    fechaInicio: body.fechaInicio,
    fechaFin: body.fechaFin,
    activa: body.activa !== false,
    genero: body.genero || "TODOS",
    prioridad: Number(body.prioridad || 0)
});

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
    const datos = datosPromocion(req.body);
    const error = validarPromocion(datos);
    if (error) return res.status(400).json({ message: error });
    const transaction = await db.transaction();
    try {
        const promocion = await Promocion.create(datos, { transaction });
        await asignarProductos(promocion, req.body.productIds, transaction);
        await asignarPresentaciones(promocion, req.body.presentationIds, transaction);
        const result = await Promocion.findByPk(promocion.id, { include: ["productos", "presentaciones"], transaction });
        await transaction.commit();
        res.status(201).json(result);
    } catch (requestError) {
        await transaction.rollback();
        throw requestError;
    }
};

export const actualizarPromocion = async (req, res) => {
    const datos = datosPromocion(req.body);
    const error = validarPromocion(datos);
    if (error) return res.status(400).json({ message: error });
    const transaction = await db.transaction();
    try {
        const promocion = await Promocion.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!promocion) {
            await transaction.rollback();
            return res.status(404).json({ message: "Promocion no encontrada" });
        }
        await promocion.update(datos, { transaction });
        await asignarProductos(promocion, req.body.productIds, transaction);
        await asignarPresentaciones(promocion, req.body.presentationIds, transaction);
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