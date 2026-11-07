import { Pedido } from "../models/pedido.model.js";
import { PedidoItem } from "../models/pedidoItem.model.js";
import { Productos } from "../models/products.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { InventarioMovimiento } from "../models/inventarioMovimiento.model.js";
import db from "../db/connect.js";


// =========================
// OBTENER TODOS LOS PEDIDOS
// =========================

export const getPedidos = async (req, res) => {
    try {

        const pedidos = await Pedido.findAll({
            include: [
                {
                    model: PedidoItem,
                    as: "items",
                    include: [
                        {
                            model: Productos,
                            as: "producto"
                        }
                    ]
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        return res.status(200).json(pedidos);

    } catch (error) {

        console.error("Error al obtener pedidos:", error);

        return res.status(500).json({
            message: "Error al obtener pedidos",
            error: error.message
        });
    }
};


// =========================
// OBTENER UN PEDIDO
// =========================

export const getPedido = async (req, res) => {
    try {

        const { id } = req.params;

        const pedido = await Pedido.findByPk(id, {
            include: [
                {
                    model: PedidoItem,
                    as: "items",
                    include: [
                        {
                            model: Productos,
                            as: "producto"
                        }
                    ]
                }
            ]
        });

        if (!pedido) {
            return res.status(404).json({
                message: "Pedido no encontrado"
            });
        }

        return res.status(200).json(pedido);

    } catch (error) {

        console.error("Error al obtener pedido:", error);

        return res.status(500).json({
            message: "Error al obtener pedido",
            error: error.message
        });
    }
};


// =========================
// CONFIRMAR PEDIDO
// =========================

export const confirmarPedido = async (req, res) => {
    return actualizarEstadoSeguro(req, res, "pagado");
};

const actualizarEstadoSeguro = async (req, res, estado) => {
    const transaction = await db.transaction();
    try {
        const pedido = await Pedido.findByPk(req.params.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!pedido) {
            await transaction.rollback();
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        const terminal = ["cancelado", "rechazado"];
        if (terminal.includes(pedido.estado) && pedido.estado !== estado) {
            await transaction.rollback();
            return res.status(409).json({ message: "Un pedido cancelado o rechazado no puede reactivarse." });
        }

        const comentarioCancelacion = String(req.body?.comentarioCancelacion || "").trim();
        if (terminal.includes(estado) && !comentarioCancelacion) {
            await transaction.rollback();
            return res.status(400).json({ message: `Debes indicar el motivo del ${estado === "rechazado" ? "rechazo" : "cancelación"}` });
        }

        if (terminal.includes(estado) && !terminal.includes(pedido.estado)) {
            const existente = await InventarioMovimiento.findOne({
                where: { pedidoId: pedido.id, tipo: "pedido_reintegro" },
                transaction
            });
            if (!existente) {
                const items = await PedidoItem.findAll({
                    where: { pedidoId: pedido.id },
                    transaction
                });
                for (const item of items) {
                    const producto = await Productos.findByPk(item.productId, {
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });
                    if (!producto) continue;

                    const presentacion = item.presentacionId
                        ? await ProductoPresentacion.findOne({
                            where: { id: item.presentacionId, productoId: producto.id },
                            transaction,
                            lock: transaction.LOCK.UPDATE
                        })
                        : null;
                    const target = presentacion?.stock != null && Number.isInteger(Number(presentacion.stock)) ? presentacion : producto;
                    if (!Number.isInteger(Number(target.stock))) continue;
                    const stockAnterior = Number(target.stock);
                    const cantidad = Number(item.cantidad);
                    await target.update({ stock: stockAnterior + cantidad }, { transaction });
                    await InventarioMovimiento.create({
                        productoId: producto.id,
                        presentacionId: target === presentacion ? presentacion.id : null,
                        pedidoId: pedido.id,
                        tipo: "pedido_reintegro",
                        cantidad,
                        stockAnterior,
                        stockNuevo: stockAnterior + cantidad,
                        motivo: `Pedido ${estado}`
                    }, { transaction });
                }
            }
        }

        await pedido.update({
            estado,
            comentarioCancelacion: terminal.includes(estado) ? comentarioCancelacion : null
        }, { transaction });
        await transaction.commit();
        return res.status(200).json({ message: "Estado del pedido actualizado correctamente", pedido });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al actualizar estado del pedido:", error);
        return res.status(500).json({ message: "Error al actualizar estado del pedido" });
    }
};


// =========================
// RECHAZAR PEDIDO
// =========================

export const rechazarPedido = async (req, res) => {
    return actualizarEstadoSeguro(req, res, "rechazado");
};


// =========================
// CANCELAR PEDIDO
// =========================

export const cancelarPedido = async (req, res) => {
    return actualizarEstadoSeguro(req, res, "cancelado");
};

// =========================
// ACTUALIZAR ESTADO PEDIDO
// =========================

export const actualizarEstadoPedido = async (req, res) => {
    const estadosPermitidos = ["pendiente", "pagado", "preparando", "enviado", "entregado", "rechazado", "cancelado"];
    if (!estadosPermitidos.includes(req.body?.estado)) {
        return res.status(400).json({ message: "Estado no válido", estadosPermitidos });
    }
    return actualizarEstadoSeguro(req, res, req.body.estado);
};
