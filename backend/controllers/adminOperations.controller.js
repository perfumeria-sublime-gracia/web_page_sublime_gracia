import { Op } from "sequelize";
import db from "../db/connect.js";
import { InventarioMovimiento } from "../models/inventarioMovimiento.model.js";
import { Pedido } from "../models/pedido.model.js";
import { PedidoItem } from "../models/pedidoItem.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { Productos } from "../models/products.model.js";
import { Reseñas } from "../models/reseñas.model.js";
import { calcularPrecioPromocional, obtenerPromocionesVigentes } from "../services/promocion.service.js";

const includeOrderItems = [{
    model: PedidoItem,
    as: "items",
    include: [{ model: Productos, as: "producto" }, { model: ProductoPresentacion, as: "presentacion" }]
}];

const findStockTarget = async ({ productId, presentationId }, transaction, lock = true) => {
    const producto = await Productos.findByPk(productId, {
        transaction,
        ...(lock ? { lock: transaction.LOCK.UPDATE } : {})
    });
    if (!producto) return { error: "Producto no encontrado" };
    if (presentationId) {
        const presentacion = await ProductoPresentacion.findOne({
            where: { id: presentationId, productoId: producto.id },
            transaction,
            ...(lock ? { lock: transaction.LOCK.UPDATE } : {})
        });
        if (!presentacion) return { error: "Presentación no encontrada" };
        return { producto, presentacion, stock: presentacion.stock ?? producto.stock };
    }
    return { producto, presentacion: null, stock: producto.stock };
};

const recordMovement = (data, transaction) => InventarioMovimiento.create(data, { transaction });
const normalizedPhone = (value) => String(value ?? "").replace(/\D/g, "");

export const listarMovimientosInventario = async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const where = {};
    if (req.query.productoId && Number.isInteger(Number(req.query.productoId))) {
        where.productoId = Number(req.query.productoId);
    }
    const movimientos = await InventarioMovimiento.findAll({
        where,
        include: [
            { model: Productos, as: "producto", attributes: ["id", "nombre", "marca"] },
            { model: ProductoPresentacion, as: "presentacion", attributes: ["id", "mililitros"] }
        ],
        order: [["createdAt", "DESC"]],
        limit
    });
    res.json(movimientos);
};

export const registrarMovimientoInventario = async (req, res) => {
    const productId = Number(req.body.productId);
    const presentationId = req.body.presentationId ? Number(req.body.presentationId) : null;
    const operation = req.body.operation;
    const quantity = Number(req.body.quantity);
    const motivo = typeof req.body.motivo === "string" ? req.body.motivo.trim().slice(0, 255) : "";

    if (!Number.isInteger(productId) || productId <= 0 ||
        (presentationId !== null && (!Number.isInteger(presentationId) || presentationId <= 0)) ||
        !["entrada", "ajuste"].includes(operation) ||
        !Number.isInteger(quantity) || quantity <= 0 ||
        (operation === "ajuste" && !motivo)) {
        return res.status(400).json({ message: "Producto, operación, cantidad positiva y motivo de ajuste son obligatorios." });
    }

    const transaction = await db.transaction();
    try {
        const target = await findStockTarget({ productId, presentationId }, transaction);
        if (target.error) {
            await transaction.rollback();
            return res.status(404).json({ message: target.error });
        }
        if (!Number.isInteger(target.stock) || target.stock < 0) {
            await transaction.rollback();
            return res.status(409).json({ message: "Este producto o presentación no tiene stock controlado." });
        }

        const delta = operation === "entrada" ? quantity : Number(req.body.direction) === -1 ? -quantity : quantity;
        const stockNuevo = target.stock + delta;
        if (stockNuevo < 0) {
            await transaction.rollback();
            return res.status(409).json({ message: "El ajuste no puede dejar existencias negativas." });
        }

        const model = target.presentacion?.stock != null && Number.isInteger(Number(target.presentacion.stock))
            ? target.presentacion
            : target.producto;
        await model.update({ stock: stockNuevo }, { transaction });
        const movimiento = await recordMovement({
            productoId: productId,
            presentacionId: model === target.presentacion ? presentationId : null,
            tipo: operation,
            cantidad: delta,
            stockAnterior: target.stock,
            stockNuevo,
            motivo: motivo || null
        }, transaction);
        await transaction.commit();
        return res.status(201).json({ movimiento, stock: stockNuevo });
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const registrarVentaPresencial = async (req, res) => {
    const items = req.body.items;
    const metodoPago = req.body.metodoPago;
    const cliente = req.body.cliente;
    if (!Array.isArray(items) || items.length === 0 || !["Efectivo", "Nequi"].includes(metodoPago)) {
        return res.status(400).json({ message: "Agrega productos y selecciona Efectivo o Nequi." });
    }
    if (cliente !== undefined && (
        !cliente || typeof cliente.nombre !== "string" || !cliente.nombre.trim() ||
        typeof cliente.telefono !== "string" || !cliente.telefono.trim() ||
        cliente.nombre.trim().length > 255 || cliente.telefono.trim().length > 40 ||
        normalizedPhone(cliente.telefono).length < 7
    )) {
        return res.status(400).json({ message: "El nombre y teléfono del cliente deben ser válidos." });
    }

    const idsVistos = new Set();
    for (const item of items) {
        const productId = Number(item.productId);
        const presentationId = item.presentationId ? Number(item.presentationId) : null;
        const quantity = Number(item.quantity);
        const customPrice = item.customPrice === undefined ? null : Number(item.customPrice);
        const soldMilliliters = item.soldMilliliters === undefined ? null : Number(item.soldMilliliters);
        const key = `${productId}:${presentationId ?? "base"}`;
        if (!Number.isInteger(productId) || productId <= 0 ||
            (presentationId !== null && (!Number.isInteger(presentationId) || presentationId <= 0)) ||
            !Number.isInteger(quantity) || quantity <= 0 ||
            (customPrice !== null && (!Number.isInteger(customPrice) || customPrice <= 0)) ||
            (soldMilliliters !== null && (!Number.isInteger(soldMilliliters) || soldMilliliters <= 0)) ||
            ((customPrice === null) !== (soldMilliliters === null)) ||
            idsVistos.has(key)) {
            return res.status(400).json({ message: "Los productos, presentaciones y cantidades de la venta no son válidos." });
        }
        idsVistos.add(key);
    }

    const transaction = await db.transaction();
    try {
        const promociones = await obtenerPromocionesVigentes();
        const ventaItems = [];

        for (const item of items) {
            const productId = Number(item.productId);
            const presentationId = item.presentationId ? Number(item.presentationId) : null;
            const quantity = Number(item.quantity);
            const customPrice = item.customPrice === undefined ? null : Number(item.customPrice);
            const soldMilliliters = item.soldMilliliters === undefined ? null : Number(item.soldMilliliters);
            const target = await findStockTarget({ productId, presentationId }, transaction);
            if (target.error || target.producto.activo === false) {
                throw Object.assign(new Error(target.error || "El producto no está activo."), { statusCode: 404 });
            }
            if (customPrice !== null && target.presentacion?.mililitros != null &&
                soldMilliliters > Number(target.presentacion.mililitros)) {
                throw Object.assign(new Error(`Los ml vendidos superan el contenido de ${target.producto.nombre}.`), { statusCode: 400 });
            }
            if (!Number.isInteger(target.stock) || target.stock < quantity) {
                throw Object.assign(new Error(`Stock insuficiente para ${target.producto.nombre}. Disponible: ${target.stock ?? 0}.`), { statusCode: 409 });
            }

            const calculo = customPrice !== null
                ? {
                    precioFinal: customPrice,
                    totalFinal: customPrice * quantity
                }
                : calcularPrecioPromocional({
                    ...target.producto.toJSON(),
                    presentacion: target.presentacion?.toJSON() ?? null
                }, quantity, promociones);
            const stockNuevo = target.stock - quantity;
            const model = target.presentacion?.stock != null && Number.isInteger(Number(target.presentacion.stock))
                ? target.presentacion
                : target.producto;
            await model.update({ stock: stockNuevo }, { transaction });
            ventaItems.push({
                producto: target.producto,
                presentacion: target.presentacion,
                stockPresentationId: model === target.presentacion ? target.presentacion.id : null,
                quantity,
                calculo,
                soldMilliliters,
                stockAnterior: target.stock,
                stockNuevo
            });
        }

        const total = ventaItems.reduce((sum, item) => sum + item.calculo.totalFinal, 0);
        let datosCliente = {
            nombre: "Venta presencial",
            telefono: "N/A",
            email: "venta-presencial@sublimegracia.local"
        };
        if (cliente) {
            const phone = normalizedPhone(cliente.telefono);
            const pedidosConTelefono = await Pedido.findAll({
                where: { canalVenta: { [Op.in]: ["web", "presencial"] } },
                attributes: ["nombre", "telefono", "email"],
                order: [["createdAt", "ASC"]],
                transaction
            });
            const clienteExistente = pedidosConTelefono.find((pedido) => normalizedPhone(pedido.telefono) === phone);
            datosCliente = clienteExistente
                ? {
                    nombre: clienteExistente.nombre,
                    telefono: clienteExistente.telefono,
                    email: clienteExistente.email
                }
                : {
                    nombre: cliente.nombre.trim(),
                    telefono: cliente.telefono.trim(),
                    email: `presencial-${phone}@sublimegracia.local`
                };
        }
        const pedido = await Pedido.create({
            ...datosCliente,
            direccion: "Venta en tienda física",
            ciudad: "Local",
            total,
            estado: "pagado",
            canalVenta: "presencial",
            metodoPago
        }, { transaction });

        for (const item of ventaItems) {
            await PedidoItem.create({
                pedidoId: pedido.id,
                productId: item.producto.id,
                presentacionId: item.stockPresentationId,
                mililitros: item.soldMilliliters ?? item.presentacion?.mililitros ?? null,
                cantidad: item.quantity,
                precio: item.calculo.precioFinal,
                nombreProducto: item.producto.nombre,
                imagenProducto: item.producto.img
            }, { transaction });
            await recordMovement({
                productoId: item.producto.id,
                presentacionId: item.stockPresentationId,
                pedidoId: pedido.id,
                tipo: "venta_presencial",
                cantidad: -item.quantity,
                stockAnterior: item.stockAnterior,
                stockNuevo: item.stockNuevo
            }, transaction);
        }

        await transaction.commit();
        return res.status(201).json({ message: "Venta presencial registrada.", pedido, items: ventaItems.map(({ producto, presentacion, quantity, calculo }) => ({ product: producto.nombre, presentation: presentacion?.mililitros ?? null, quantity, total: calculo.totalFinal })) });
    } catch (error) {
        await transaction.rollback();
        return res.status(error.statusCode || 500).json({ message: error.message || "No se pudo registrar la venta presencial." });
    }
};

export const listarClientes = async (req, res) => {
    const search = String(req.query.search ?? "").trim();
    const pedidos = await Pedido.findAll({
        where: { canalVenta: { [Op.in]: ["web", "presencial"] } },
        attributes: ["nombre", "email", "telefono", "ciudad", "total", "estado", "createdAt", "canalVenta"],
        order: [["createdAt", "DESC"]]
    });
    const customers = new Map();
    for (const order of pedidos) {
        const phone = normalizedPhone(order.telefono);
        if (order.canalVenta === "presencial" && phone.length < 7) continue;
        const key = phone.length >= 7 ? `telefono:${phone}` : `email:${order.email.toLowerCase()}`;
        const customer = customers.get(key) || {
            id: phone.length >= 7 ? key : order.email.toLowerCase(),
            nombre: order.nombre,
            email: order.email,
            telefono: order.telefono,
            ciudad: order.ciudad,
            totalCompras: 0,
            pedidos: 0,
            canalVenta: phone.length >= 7 && order.canalVenta === "presencial" ? "presencial" : "web"
        };
        if (phone.length >= 7 && order.canalVenta === "web") customer.canalVenta = "web";
        if (!["cancelado", "rechazado", "pendiente"].includes(order.estado)) {
            customer.totalCompras += Number(order.total);
            customer.pedidos += 1;
        }
        customers.set(key, customer);
    }
    const normalizedSearch = search.toLocaleLowerCase();
    res.json([...customers.values()].filter((customer) =>
        !normalizedSearch || [customer.nombre, customer.email, customer.telefono, customer.ciudad]
            .some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedSearch))
    ));
};

export const obtenerPedidosCliente = async (req, res) => {
    const customerId = req.params.email;
    if (customerId.startsWith("telefono:")) {
        const phone = normalizedPhone(customerId.slice("telefono:".length));
        const pedidos = await Pedido.findAll({
            where: { canalVenta: { [Op.in]: ["web", "presencial"] } },
            include: includeOrderItems,
            order: [["createdAt", "DESC"]]
        });
        return res.json(pedidos.filter((pedido) => normalizedPhone(pedido.telefono) === phone));
    }
    const pedidos = await Pedido.findAll({
        where: { email: { [Op.iLike]: customerId }, canalVenta: { [Op.in]: ["web", "presencial"] } },
        include: includeOrderItems,
        order: [["createdAt", "DESC"]]
    });
    return res.json(pedidos);
};

export const obtenerDashboard = async (_req, res) => {
    const [orders, products] = await Promise.all([
        Pedido.findAll({ include: includeOrderItems, order: [["createdAt", "DESC"]] }),
        Productos.findAll({ include: [{ association: "presentaciones", required: false }] })
    ]);
    const ventas = orders.filter((order) => !["cancelado", "rechazado", "pendiente"].includes(order.estado));
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const topProducts = new Map();
    for (const order of ventas) {
        for (const item of order.items ?? []) {
            const key = item.productId;
            const current = topProducts.get(key) || { productId: key, nombre: item.nombreProducto || item.producto?.nombre || "Producto", unidades: 0, ventas: 0 };
            current.unidades += Number(item.cantidad);
            current.ventas += Number(item.precio) * Number(item.cantidad);
            topProducts.set(key, current);
        }
    }
    const stockValues = products.flatMap((product) => {
        const presentacionesActivas = (product.presentaciones || []).filter((presentation) => presentation.activo);
        return presentacionesActivas.length
            ? presentacionesActivas.map((presentation) => Number(presentation.stock ?? product.stock ?? 0))
            : [Number(product.stock ?? 0)];
    });
    res.json({
        ventasHoy: ventas.filter((order) => new Date(order.createdAt).toDateString() === hoy.toDateString()).reduce((sum, order) => sum + Number(order.total), 0),
        ventasMes: ventas.filter((order) => new Date(order.createdAt) >= inicioMes).reduce((sum, order) => sum + Number(order.total), 0),
        pedidosPendientes: orders.filter((order) => order.estado === "pendiente").length,
        pedidosAceptados: orders.filter((order) => ["pagado", "preparando", "enviado", "entregado"].includes(order.estado)).length,
        productosDisponibles: stockValues.filter((stock) => stock > 0).length,
        stockBajo: stockValues.filter((stock) => stock > 0 && stock <= 10).length,
        agotados: stockValues.filter((stock) => stock <= 0).length,
        ventasUltimosSieteDias: Array.from({ length: 7 }, (_, index) => {
            const date = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6 + index);
            return {
                fecha: date.toISOString().slice(0, 10),
                total: ventas.filter((order) => new Date(order.createdAt).toDateString() === date.toDateString()).reduce((sum, order) => sum + Number(order.total), 0)
            };
        }),
        productosMasVendidos: [...topProducts.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5)
    });
};

export const listarOpinionesAdmin = async (req, res) => {
    const where = {};
    if (req.query.activa === "true" || req.query.activa === "false") where.activa = req.query.activa === "true";
    const reviews = await Reseñas.findAll({
        where,
        include: [{ model: Productos, as: "producto", attributes: ["id", "nombre"] }],
        order: [["createdAt", "DESC"]]
    });
    res.json(reviews);
};

export const cambiarEstadoOpinion = async (req, res) => {
    if (typeof req.body.activa !== "boolean") {
        return res.status(400).json({ message: "El campo activa debe ser booleano." });
    }
    const opinion = await Reseñas.findByPk(req.params.id);
    if (!opinion) return res.status(404).json({ message: "Opinión no encontrada." });
    await opinion.update({ activa: req.body.activa });
    res.json(opinion);
};

export const eliminarOpinion = async (req, res) => {
    const opinion = await Reseñas.findByPk(req.params.id);
    if (!opinion) return res.status(404).json({ message: "Opinión no encontrada." });
    await opinion.destroy();
    res.json({ message: "Opinión eliminada." });
};
