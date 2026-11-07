import Sequelize from "sequelize";
import { Productos } from "../models/products.model.js";
import { ProductoPresentacion } from "../models/productoPresentacion.model.js";
import { InventarioMovimiento } from "../models/inventarioMovimiento.model.js";
import db from "../db/connect.js";
import { obtenerPromocionesVigentes, calcularPrecioPromocional } from "../services/promocion.service.js";
import { guardarImagenProducto } from "../services/productImageStorage.js";

const GENEROS = ["HOMBRE", "MUJER", "UNISEX"];
const CATEGORIAS = ["Amaderadas", 
    "Árabes", 
    "Cítricas", 
    "Aromáticas", 
    "Floral", 
    "Frutales", 
    "Dulces", 
    "Dulces", 
    "Frescas", 
    "Especiadas", 
    "Otros"];

const texto = (value) => typeof value === "string" ? value.trim() : "";
const imagenValida = (value) => !value || value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/uploads/");

const leerPresentaciones = (value) => {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const validarPresentaciones = (presentaciones) => {
    if (!presentaciones.length) return "Agrega al menos una presentacion";
    const ids = new Set();
    for (const presentacion of presentaciones) {
        const mililitros = presentacion.mililitros === "" || presentacion.mililitros == null ? null : Number(presentacion.mililitros);
        const precio = Number(presentacion.precio);
        const stock = Number(presentacion.stock);
        const clave = mililitros == null ? "legacy" : String(mililitros);
        if (mililitros !== null && (!Number.isInteger(mililitros) || mililitros <= 0)) return "Los mililitros deben ser mayores que 0";
        if (!Number.isFinite(precio) || precio <= 0) return "El precio de cada presentacion debe ser mayor que 0";
        if (!Number.isInteger(stock) || stock < 0) return "El stock de cada presentacion no puede ser negativo";
        if (ids.has(clave)) return "No puede haber presentaciones duplicadas";
        ids.add(clave);
    }
    return null;
};

const validarProducto = (data, imagen) => {
    const nombre = texto(data.nombre);
    const descripcion = texto(data.descripcion);
    const genero = texto(data.genero).toUpperCase();
    const precio = Number(data.precio);
    const stock = Number(data.stock);
    const categoria = texto(data.categoria);
    const marca = texto(data.marca);

    if (!nombre) return "El nombre es obligatorio";
    if (!descripcion) return "La descripcion es obligatoria";
    if (!GENEROS.includes(genero)) return "El genero no es valido";
    if (!Number.isFinite(precio) || precio <= 0) return "El precio debe ser mayor que 0";
    if (!Number.isInteger(stock) || stock < 0) return "El stock no puede ser negativo";
    if (!CATEGORIAS.includes(categoria)) return "La categoria no es valida";
    if (!marca) return "La marca es obligatoria";
    if (!imagenValida(imagen)) return "La imagen no es valida";

    return null;
};

const datosProducto = (body, imagen) => ({
    nombre: texto(body.nombre),
    marca: texto(body.marca),
    genero: texto(body.genero).toUpperCase(),
    categoria: texto(body.categoria),
    segmentacion: texto(body.segmentacion) || texto(body.categoria) || "Otros",
    descripcion: texto(body.descripcion),
    precio: Number(body.precio),
    stock: Number(body.stock),
    activo: body.activo !== "false" && body.activo !== false,
    img: imagen
});

const incluirPresentaciones = {
    association: "presentaciones",
    required: false,
    separate: true,
    order: [["mililitros", "ASC"]]
};

const enriquecer = async (productos) => {
    const promociones = await obtenerPromocionesVigentes();
    return productos.map((producto) => ({
        ...producto.toJSON(),
        ...calcularPrecioPromocional(producto, 1, promociones),
        presentaciones: (producto.presentaciones || []).sort((a, b) => (a.mililitros ?? 0) - (b.mililitros ?? 0)).map((presentacion) => ({
            ...presentacion.toJSON(),
            ...calcularPrecioPromocional({ ...producto.toJSON(), presentacion: presentacion.toJSON() }, 1, promociones)
        }))
    }));
};

export const listarProductosPublicos = async (_req, res) => {
    const productos = await Productos.findAll({
        where: { activo: true },
        include: [incluirPresentaciones],
        order: [["createdAt", "DESC"]]
    });
    res.json(await enriquecer(productos));
};

export const listarProductosAdmin = async (req, res) => {
    const { search, genero, activo, stock } = req.query;
    const where = {};
    if (search) {
        where[Sequelize.Op.or] = [
            { nombre: { [Sequelize.Op.iLike]: `%${search}%` } },
            { marca: { [Sequelize.Op.iLike]: `%${search}%` } }
        ];
    }
    if (genero && GENEROS.includes(String(genero).toUpperCase())) where.genero = String(genero).toUpperCase();
    if (activo === "true" || activo === "false") where.activo = activo === "true";
    if (stock === "disponible") where.stock = { [Sequelize.Op.gt]: 0 };
    if (stock === "agotado") where[Sequelize.Op.or] = [{ stock: 0 }, { stock: null }];

    const productos = await Productos.findAll({ where, include: [incluirPresentaciones], order: [["createdAt", "DESC"]] });
    res.json(await enriquecer(productos));
};

export const obtenerProducto = async (req, res) => {
    const producto = await Productos.findByPk(req.params.id, { include: [incluirPresentaciones] });
    if (!producto || !producto.activo) return res.status(404).json({ message: "Producto no encontrado" });
    res.json((await enriquecer([producto]))[0]);
};

export const crearProducto = async (req, res) => {
    const imagen = req.file ? "/uploads/productos/imagen-pendiente" : texto(req.body.img);
    if (!imagen) return res.status(400).json({ message: "La imagen es obligatoria" });
    const presentaciones = leerPresentaciones(req.body.presentaciones);
    const error = validarProducto(req.body, imagen) || validarPresentaciones(presentaciones);
    if (error) return res.status(400).json({ message: error });

    const imagenGuardada = req.file ? await guardarImagenProducto(req.file) : imagen;
    const transaction = await db.transaction();
    try {
        const producto = await Productos.create(datosProducto(req.body, imagenGuardada), { transaction });
        const nuevasPresentaciones = await ProductoPresentacion.bulkCreate(presentaciones.map((item) => ({
            ...item,
            productoId: producto.id,
            mililitros: item.mililitros === "" ? null : Number(item.mililitros),
            precio: Number(item.precio),
            stock: Number(item.stock),
            activo: item.activo !== false && item.activo !== "false"
        })), { transaction, returning: true });

        if (Number(producto.stock) > 0) {
            await InventarioMovimiento.create({
                productoId: producto.id, tipo: "ajuste", cantidad: Number(producto.stock),
                stockAnterior: 0, stockNuevo: Number(producto.stock), motivo: "Stock inicial de producto"
            }, { transaction });
        }
        for (const presentacion of nuevasPresentaciones) {
            if (Number(presentacion.stock) > 0) {
                await InventarioMovimiento.create({
                    productoId: producto.id, presentacionId: presentacion.id,
                    tipo: "ajuste", cantidad: Number(presentacion.stock),
                    stockAnterior: 0, stockNuevo: Number(presentacion.stock),
                    motivo: "Stock inicial de presentación"
                }, { transaction });
            }
        }

        await transaction.commit();
        await producto.reload({ include: [incluirPresentaciones] });
        res.status(201).json((await enriquecer([producto]))[0]);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const actualizarProducto = async (req, res) => {
    const productoExistente = await Productos.findByPk(req.params.id, { include: [incluirPresentaciones] });
    if (!productoExistente) return res.status(404).json({ message: "Producto no encontrado" });

    const imagen = req.file ? "/uploads/productos/imagen-pendiente" : texto(req.body.img) || productoExistente.img;
    const presentaciones = leerPresentaciones(req.body.presentaciones);
    const error = validarProducto(req.body, imagen) || validarPresentaciones(presentaciones);
    if (error) return res.status(400).json({ message: error });

    const imagenGuardada = req.file ? await guardarImagenProducto(req.file) : imagen;
    const transaction = await db.transaction();
    try {
        const producto = await Productos.findByPk(req.params.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
            include: [incluirPresentaciones]
        });
        if (!producto) {
            await transaction.rollback();
            return res.status(404).json({ message: "Producto no encontrado" });
        }
        const stockProductoAnterior = producto.stock;
        const stockProductoNuevo = Number(req.body.stock);
        await producto.update(datosProducto(req.body, imagenGuardada), { transaction });
        const stockProductoAnteriorSeguro = Number(stockProductoAnterior ?? 0);
        if (stockProductoAnteriorSeguro !== stockProductoNuevo) {
            await InventarioMovimiento.create({
                productoId: producto.id,
                tipo: "ajuste",
                cantidad: stockProductoNuevo - stockProductoAnteriorSeguro,
                stockAnterior: stockProductoAnteriorSeguro,
                stockNuevo: stockProductoNuevo,
                motivo: "Ajuste de stock desde catálogo"
            }, { transaction });
        }

        const oldPresentations = producto.presentaciones || [];
        const incomingIds = new Set(presentaciones.filter((item) => item.id != null).map((item) => Number(item.id)));
        for (const oldPresentation of oldPresentations) {
            if (!incomingIds.has(oldPresentation.id)) {
                await oldPresentation.update({ activo: false }, { transaction });
            }
        }
        for (const item of presentaciones) {
            const presentationData = {
                productoId: producto.id,
                mililitros: item.mililitros === "" || item.mililitros == null ? null : Number(item.mililitros),
                precio: Number(item.precio),
                stock: Number(item.stock),
                activo: item.activo !== false && item.activo !== "false"
            };
            const existing = item.id == null
                ? null
                : oldPresentations.find((presentation) => presentation.id === Number(item.id));
            if (item.id != null && !existing) {
                throw Object.assign(new Error("Una presentación no pertenece a este producto."), { statusCode: 400 });
            }
            if (existing) {
                const stockAnterior = existing.stock;
                await existing.update(presentationData, { transaction });
                const stockAnteriorSeguro = Number(stockAnterior ?? 0);
                if (stockAnteriorSeguro !== presentationData.stock) {
                    await InventarioMovimiento.create({
                        productoId: producto.id,
                        presentacionId: existing.id,
                        tipo: "ajuste",
                        cantidad: presentationData.stock - stockAnteriorSeguro,
                        stockAnterior: stockAnteriorSeguro,
                        stockNuevo: presentationData.stock,
                        motivo: "Ajuste de stock desde catálogo"
                    }, { transaction });
                }
            } else {
                const created = await ProductoPresentacion.create(presentationData, { transaction });
                if (presentationData.stock > 0) {
                    await InventarioMovimiento.create({
                        productoId: producto.id,
                        presentacionId: created.id,
                        tipo: "ajuste",
                        cantidad: presentationData.stock,
                        stockAnterior: 0,
                        stockNuevo: presentationData.stock,
                        motivo: "Stock inicial de presentación"
                    }, { transaction });
                }
            }
        }
        await transaction.commit();
        await producto.reload({ include: [incluirPresentaciones] });
        res.json((await enriquecer([producto]))[0]);
    } catch (error) {
        await transaction.rollback();
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        throw error;
    }
};

export const cambiarEstadoProducto = async (req, res) => {
    const producto = await Productos.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
    await producto.update({ activo: Boolean(req.body.activo) });
    res.json(producto);
};

export const eliminarProducto = async (req, res) => {
    const producto = await Productos.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

    await producto.update({ activo: false });
    res.json({ message: "Producto desactivado del catálogo", eliminadoFisicamente: false });
};
