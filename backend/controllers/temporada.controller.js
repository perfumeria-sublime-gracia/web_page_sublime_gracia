import { Op } from "sequelize";
import db from "../db/connect.js";
import { Temporada } from "../models/temporada.model.js";
import { seasonStatus, validateSeasonInput } from "../services/temporada.service.js";

const temporadaActivaAhora = (now = new Date()) => ({
    habilitada: true,
    fechaInicio: { [Op.lte]: now },
    fechaFin: { [Op.gt]: now }
});

const bloquearTemporadas = (transaction) =>
    db.query('LOCK TABLE "temporadas" IN EXCLUSIVE MODE', { transaction });

const tieneConflicto = async (seasonData, excludedId, transaction) => {
    const now = new Date();
    const where = {
        habilitada: true,
        fechaFin: { [Op.gt]: now },
        fechaInicio: { [Op.lt]: seasonData.fechaFin },
        [Op.and]: [{ fechaFin: { [Op.gt]: seasonData.fechaInicio } }]
    };
    if (excludedId !== undefined) where.id = { [Op.ne]: excludedId };
    const conflict = await Temporada.findOne({ where, transaction });
    return conflict;
};

const serializeSeason = (season, now = new Date()) => ({
    ...season.toJSON(),
    estado: seasonStatus(season, now)
});

export const obtenerTemporadaActiva = async (_req, res) => {
    const temporada = await Temporada.findOne({
        where: temporadaActivaAhora(),
        order: [["fechaInicio", "DESC"]]
    });
    res.json(temporada ? serializeSeason(temporada) : null);
};

export const listarTemporadas = async (_req, res) => {
    const temporadas = await Temporada.findAll({ order: [["fechaInicio", "DESC"], ["updatedAt", "DESC"]] });
    res.json(temporadas.map((temporada) => serializeSeason(temporada)));
};

export const crearTemporada = async (req, res) => {
    const validated = validateSeasonInput(req.body);
    if (validated.error) return res.status(400).json({ message: validated.error });
    const transaction = await db.transaction();
    try {
        await bloquearTemporadas(transaction);
        if (validated.value.habilitada) {
            if (validated.value.fechaFin <= new Date()) {
                await transaction.rollback();
                return res.status(400).json({ message: "No se puede activar una temporada cuya fecha de finalización ya pasó." });
            }
            const conflict = await tieneConflicto(validated.value, undefined, transaction);
            if (conflict) {
                await transaction.rollback();
                return res.status(409).json({ message: `Se cruza con la temporada "${conflict.nombre}". Desactívala o ajusta las fechas.` });
            }
        }
        const temporada = await Temporada.create(validated.value, { transaction });
        await transaction.commit();
        return res.status(201).json(serializeSeason(temporada));
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const actualizarTemporada = async (req, res) => {
    const validated = validateSeasonInput(req.body);
    if (validated.error) return res.status(400).json({ message: validated.error });
    const transaction = await db.transaction();
    try {
        await bloquearTemporadas(transaction);
        const temporada = await Temporada.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!temporada) {
            await transaction.rollback();
            return res.status(404).json({ message: "Temporada no encontrada." });
        }
        if (validated.value.habilitada) {
            if (validated.value.fechaFin <= new Date()) {
                await transaction.rollback();
                return res.status(400).json({ message: "No se puede habilitar una temporada cuya fecha de finalización ya pasó." });
            }
            const conflict = await tieneConflicto(validated.value, temporada.id, transaction);
            if (conflict) {
                await transaction.rollback();
                return res.status(409).json({ message: `Se cruza con la temporada "${conflict.nombre}". Desactívala o ajusta las fechas.` });
            }
        }
        await temporada.update(validated.value, { transaction });
        await transaction.commit();
        return res.json(serializeSeason(temporada));
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const cambiarEstadoTemporada = async (req, res) => {
    if (typeof req.body.habilitada !== "boolean") {
        return res.status(400).json({ message: "El estado habilitada debe ser booleano." });
    }
    const transaction = await db.transaction();
    try {
        await bloquearTemporadas(transaction);
        const temporada = await Temporada.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!temporada) {
            await transaction.rollback();
            return res.status(404).json({ message: "Temporada no encontrada." });
        }
        if (req.body.habilitada) {
            if (new Date(temporada.fechaFin) <= new Date()) {
                await transaction.rollback();
                return res.status(400).json({ message: "No se puede activar una temporada cuya fecha de finalización ya pasó." });
            }
            const conflict = await tieneConflicto(temporada, temporada.id, transaction);
            if (conflict) {
                await transaction.rollback();
                return res.status(409).json({ message: `Se cruza con la temporada "${conflict.nombre}". Desactívala o ajusta las fechas.` });
            }
        }
        await temporada.update({ habilitada: req.body.habilitada }, { transaction });
        await transaction.commit();
        return res.json(serializeSeason(temporada));
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const eliminarTemporada = async (req, res) => {
    const temporada = await Temporada.findByPk(req.params.id);
    if (!temporada) return res.status(404).json({ message: "Temporada no encontrada." });
    await temporada.destroy();
    return res.json({ message: "Temporada eliminada." });
};

export const finalizarTemporadasVencidas = async () => {
    await Temporada.update(
        { habilitada: false },
        { where: { habilitada: true, fechaFin: { [Op.lte]: new Date() } } }
    );
};
