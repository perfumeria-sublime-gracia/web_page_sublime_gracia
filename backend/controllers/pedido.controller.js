import { Pedido } from "../models/pedido.model.js";
import { PedidoItem } from "../models/pedidoItem.model.js";
import { Cart } from "../models/cart.model.js";
import { CartItem } from "../models/cartItems.model.js";
import { Productos } from "../models/products.model.js";
import { obtenerPromocionesVigentes, calcularPrecioPromocional } from "../services/promocion.service.js";
import db from "../db/connect.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { InventarioMovimiento } from "../models/inventarioMovimiento.model.js";

// ==========================================
// CREAR PEDIDO
// ==========================================

export const crearPedido = async (req, res) => {
    let transaction;
    try {

        const {
            nombre,
            telefono,
            email,
            direccion,
            ciudad,
            cartId
        } = req.body;

        // ==========================================
        // COMPROBANTE RECIBIDO POR MULTER
        // ==========================================

        const comprobante = req.file;

        // ==========================================
        // VALIDAR DATOS
        // ==========================================

        if (
            !nombre ||
            !telefono ||
            !email ||
            !direccion ||
            !ciudad ||
            !cartId
        ) {
            return res.status(400).json({
                message: "Faltan datos para crear el pedido"
            });
        }

        if (req.body.privacyAcknowledged !== "true" && req.body.privacyAcknowledged !== true) {
            return res.status(400).json({
                message: "Debes aceptar la política de privacidad para procesar el pedido"
            });
        }

        if (req.body.shippingDisclosureAcknowledged !== "true" && req.body.shippingDisclosureAcknowledged !== true) {
            return res.status(400).json({
                message: "Debes confirmar que conoces las condiciones del costo de envío"
            });
        }

        // ==========================================
        // VALIDAR COMPROBANTE
        // ==========================================

        if (!comprobante) {
            return res.status(400).json({
                message: "Debes enviar el comprobante de pago"
            });
        }

        // ==========================================
        // BUSCAR CARRITO
        // ==========================================

        const carrito = await Cart.findByPk(cartId);

        if (!carrito) {
            return res.status(404).json({
                message: "Carrito no encontrado"
            });
        }

        // ==========================================
        // BUSCAR PRODUCTOS DEL CARRITO
        // ==========================================

        const items = await CartItem.findAll({
            where: {
                cartId
            },
            include: [
                {
                    model: Productos,
                    as: "producto"
                },
                {
                    model: ProductoPresentacion,
                    as: "presentacion"
                }
            ]
        });

        // ==========================================
        // VALIDAR CARRITO
        // ==========================================

        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "El carrito está vacío"
            });
        }

        // ==========================================
        // CREAR PEDIDO
        // ==========================================

        transaction = await db.transaction();
        const promociones = await obtenerPromocionesVigentes();
        const itemsCalculados = [];

        for (const item of items) {
            const producto = await Productos.findByPk(item.productId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const presentacion = item.presentacionId
                ? await ProductoPresentacion.findOne({
                    where: { id: item.presentacionId, productoId: item.productId, activo: true },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                })
                : null;

            if (!producto || producto.activo === false || (item.presentacionId && !presentacion)) {
                throw Object.assign(new Error(`El producto ${item.productId} no está disponible.`), { statusCode: 409 });
            }

            const stock = presentacion?.stock ?? producto.stock;
            if (stock !== null && item.quantity > stock) {
                throw Object.assign(new Error(`No hay suficiente stock para ${producto.nombre}. Disponible: ${stock}`), { statusCode: 409 });
            }

            itemsCalculados.push({
                item,
                producto,
                presentacion,
                calculo: calcularPrecioPromocional({ ...producto.toJSON(), presentacion: presentacion?.toJSON() }, item.quantity, promociones)
            });
        }

        const totalCalculado = itemsCalculados.reduce((sum, current) => sum + current.calculo.totalFinal, 0);

        const pedido = await Pedido.create({
            nombre,
            telefono,
            email,
            direccion,
            ciudad,
            total: totalCalculado,
            estado: "pendiente",
            comprobante: req.file
                ? `/uploads/comprobantes/${req.file.filename}`
                : null
        }, { transaction });

        // ==========================================
        // CREAR ITEMS DEL PEDIDO
        // ==========================================

        for (const { item, producto, presentacion, calculo } of itemsCalculados) {

            await PedidoItem.create({
                pedidoId: pedido.id,
                productId: item.productId,
                presentacionId: presentacion?.id ?? null,
                mililitros: presentacion?.mililitros ?? null,
                cantidad: item.quantity,
                precio: calculo.precioFinal,
                nombreProducto: producto.nombre,
                imagenProducto: producto.img
            }, { transaction });

            if (presentacion?.stock != null && Number.isInteger(Number(presentacion.stock))) {
                const stockAnterior = Number(presentacion.stock);
                await presentacion.decrement("stock", {
                    by: item.quantity,
                    transaction
                });
                await InventarioMovimiento.create({
                    productoId: producto.id,
                    presentacionId: presentacion.id,
                    pedidoId: pedido.id,
                    tipo: "venta_web",
                    cantidad: -Number(item.quantity),
                    stockAnterior,
                    stockNuevo: stockAnterior - Number(item.quantity)
                }, { transaction });
            } else if (producto.stock !== null) {
                const stockAnterior = Number(producto.stock);
                await producto.decrement("stock", { by: item.quantity, transaction });
                await InventarioMovimiento.create({
                    productoId: producto.id,
                    pedidoId: pedido.id,
                    tipo: "venta_web",
                    cantidad: -Number(item.quantity),
                    stockAnterior,
                    stockNuevo: stockAnterior - Number(item.quantity)
                }, { transaction });
            }
        }

        // ==========================================
        // VACIAR CARRITO
        // ==========================================

        await CartItem.destroy({
            where: {
                cartId
            },
            transaction
        });

        await transaction.commit();

        // ==========================================
        // RESPUESTA
        // ==========================================

        return res.status(201).json({
            message: "Pedido creado correctamente",
            pedido,
            totalCalculado
        });

    } catch (error) {

        if (transaction) {
            await transaction.rollback();
        }

        console.error(
            "Error al crear pedido:",
            error
        );

        return res.status(error.statusCode || 500).json({
            message: error.message || "Error al crear pedido"
        });
    }
};

export const obtenerSeguimientoPedido = async (req, res) => {
    try {
        const pedido = await Pedido.findByPk(req.params.id, {
            attributes: [
                "id", "nombre", "total", "estado", "referencia",
                "comentarioCancelacion", "createdAt", "updatedAt"
            ],
            include: [{
                model: PedidoItem,
                as: "items",
                attributes: ["id", "cantidad", "precio", "nombreProducto", "imagenProducto", "mililitros"]
            }]
        });

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        return res.json(pedido);
    } catch (error) {
        console.error("Error al consultar seguimiento:", error);
        return res.status(500).json({ message: "No se pudo consultar el pedido" });
    }
};
