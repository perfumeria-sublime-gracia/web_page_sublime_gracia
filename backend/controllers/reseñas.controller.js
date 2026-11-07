import { Reseñas } from "../models/reseñas.model.js";
import { Productos } from "../models/products.model.js";


export const createReseña = async (req, res) => {
    const { productoId, nombre, opinion, calificacion } = req.body;
    const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
    const opinionLimpia = typeof opinion === "string" ? opinion.trim() : "";
    const puntuacion = Number(calificacion);
    const idProducto = Number(productoId);

    if (req.body.privacyAcknowledged !== true && req.body.privacyAcknowledged !== "true") {
        return res.status(400).json({ message: "Debes aceptar la política de privacidad." });
    }

    if (!Number.isInteger(idProducto) || idProducto <= 0 || !nombreLimpio || !opinionLimpia ||
        !Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
        return res.status(400).json({ message: "Indica producto, nombre, opinión y una calificación de 1 a 5." });
    }

    const producto = await Productos.findOne({ where: { id: idProducto, activo: true } });
    if (!producto) return res.status(404).json({ message: "Producto no encontrado." });

    const reseña = await Reseñas.create({
        productoId: idProducto,
        nombre: nombreLimpio.slice(0, 80),
        opinion: opinionLimpia.slice(0, 1000),
        calificacion: puntuacion
    });

    return res.status(201).json(reseña);
};

export const getReseñas = async (req, res) => {
    const productoId = Number(req.query.productoId);
    if (!Number.isInteger(productoId) || productoId <= 0) {
        return res.status(400).json({ message: "Debes indicar el producto de las opiniones." });
    }

    const reseñas = await Reseñas.findAll({
        where: { productoId, activa: true },
        order: [["createdAt", "DESC"]]
    });
    if (reseñas.length === 0) {
        return res.status(200).json([]);
    }
    return res.status(200).json(reseñas);
};

export const deleteReseña = async (req, res) => {
    const { id } = req.params
    const _ = await Reseñas.findByPk(id)

    if(!_) return res.status(404).json({ message: "No se encontró la opinión." });

    await _.destroy();
    return res.status(200).json({ message: "Opinión eliminada." });
}