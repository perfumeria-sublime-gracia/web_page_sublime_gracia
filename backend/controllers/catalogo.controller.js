import { Productos } from "../models/products.model.js"
import Sequelize from "sequelize"

import {
    obtenerPromocionesVigentes,
    calcularPrecioPromocional
} from "../services/promocion.service.js"


// =====================================================
// ENRIQUECER PRODUCTOS
// =====================================================

const enriquecerProductos = async (productos) => {

    const promociones = await obtenerPromocionesVigentes()

    return productos.map((producto) => {

        const productoJSON = producto.toJSON()

        return {
            ...productoJSON,

            ...calcularPrecioPromocional(
                producto,
                1,
                promociones
            ),

            presentaciones: (producto.presentaciones || [])
                .map((presentacion) => {

                    const presentacionJSON =
                        presentacion.toJSON()

                    return {
                        ...presentacionJSON,

                        ...calcularPrecioPromocional(
                            {
                                ...productoJSON,
                                presentacion: presentacionJSON
                            },
                            1,
                            promociones
                        )
                    }
                })
                .sort(
                    (a, b) =>
                        (a.mililitros ?? 0) -
                        (b.mililitros ?? 0)
                )
        }
    })
}


// =====================================================
// RELACIÓN PRESENTACIONES
// =====================================================

const includePresentaciones = {
    association: "presentaciones",
    required: false,
    separate: true,
    order: [["mililitros", "ASC"]]
}


// =====================================================
// CREAR PRODUCTO
// =====================================================

export const createProduct = async (req, res) => {

    try {

        console.log("BODY:", req.body)
        console.log("FILE:", req.file)

        const {
            nombre,
            descripcion,
            precio,
            genero,
            segmentacion,
            marca,
            stock,
            activo
        } = req.body


        // -----------------------------
        // VALIDACIONES
        // -----------------------------

        if (!nombre?.trim()) {
            return res.status(400).json({
                message: "El nombre es obligatorio"
            })
        }

        if (!marca?.trim()) {
            return res.status(400).json({
                message: "La marca es obligatoria"
            })
        }

        if (!descripcion?.trim()) {
            return res.status(400).json({
                message: "La descripción es obligatoria"
            })
        }

        if (!precio) {
            return res.status(400).json({
                message: "El precio es obligatorio"
            })
        }

        if (!genero) {
            return res.status(400).json({
                message: "El género es obligatorio"
            })
        }

        if (!segmentacion) {
            return res.status(400).json({
                message: "La categoría es obligatoria"
            })
        }


        // -----------------------------
        // IMAGEN
        // -----------------------------

        if (!req.file) {

            return res.status(400).json({
                message: "Debes seleccionar una imagen"
            })

        }


        // Esta es la ruta que se guarda
        // en PostgreSQL

        const img = `/uploads/${req.file.filename}`


        // -----------------------------
        // CREAR PRODUCTO
        // -----------------------------

        const product = await Productos.create({

            nombre: nombre.trim(),

            marca: marca?.trim() || null,

            descripcion: descripcion.trim(),

            precio: Number(precio),

            genero,

            segmentacion,

            stock:
                stock !== undefined
                    ? Number(stock)
                    : 0,

            activo:
                activo === undefined
                    ? true
                    : activo !== "false",

            img

        })


        return res.status(201).json(product)


    } catch (error) {

        console.error(
            "ERROR CREANDO PRODUCTO:",
            error
        )

        return res.status(500).json({
            message: "Error al crear el producto",
            error: error.message
        })
    }
}


// =====================================================
// OBTENER TODOS LOS PRODUCTOS
// =====================================================

export const getAllProducts = async (req, res) => {

    try {

        const paginaSolicitada = Number(req.query.pagina);
        const pagina = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0
            ? paginaSolicitada
            : 1;
        const limite = 20;
        const where = {
            [Sequelize.Op.or]: [
                { activo: true },
                { activo: null }
            ]
        };

        if (req.query.categoria) {
            where.segmentacion = req.query.categoria;
        }

        if (req.query.genero) {
            where.genero = String(req.query.genero).toUpperCase();
        }

        const [productos, total, categorias] = await Promise.all([
            Productos.findAll({
                where,
                include: [includePresentaciones],
                order: [["createdAt", "DESC"], ["id", "DESC"]],
                limit: limite,
                offset: (pagina - 1) * limite
            }),
            Productos.count({ where }),
            Productos.findAll({
                attributes: ["segmentacion"],
                where: {
                    [Sequelize.Op.or]: [
                        { activo: true },
                        { activo: null }
                    ]
                },
                group: ["segmentacion"],
                raw: true
            })
        ]);

        return res.status(200).json({
            productos: await enriquecerProductos(productos),
            categorias: categorias.map(({ segmentacion }) => segmentacion).filter(Boolean),
            hayMas: pagina * limite < total
        });


    } catch (error) {

        console.error(
            "ERROR OBTENIENDO PRODUCTOS:",
            error
        )

        return res.status(500).json({
            message: "Error obteniendo productos",
            error: error.message
        })
    }
}


// =====================================================
// OBTENER PRODUCTOS POR SEGMENTACIÓN
// =====================================================

export const getProductsSeg = async (req, res) => {

    try {

        const { seg } = req.params


        const productos =
            await Productos.findAll({

                where: {

                    segmentacion: seg,

                    [Sequelize.Op.or]: [
                        { activo: true },
                        { activo: null }
                    ]

                },

                include: [
                    includePresentaciones
                ]

            })


        return res.status(200).json(
            await enriquecerProductos(productos)
        )


    } catch (error) {

        console.error(
            "ERROR OBTENIENDO PRODUCTOS POR SEGMENTACIÓN:",
            error
        )

        return res.status(500).json({
            message:
                "Error obteniendo productos",
            error: error.message
        })
    }
}


// =====================================================
// OBTENER UN PRODUCTO
// =====================================================

export const getOneProduct = async (req, res) => {

    try {

        const { id } = req.params


        const product =
            await Productos.findByPk(id, {

                include: [
                    includePresentaciones
                ]

            })


        if (!product || product.activo === false) {

            return res.status(404).json({
                message:
                    "No se encontró el producto"
            })

        }


        const promociones =
            await obtenerPromocionesVigentes()


        return res.status(200).json({

            ...product.toJSON(),

            ...calcularPrecioPromocional(
                product,
                1,
                promociones
            )

        })


    } catch (error) {

        console.error(
            "ERROR OBTENIENDO PRODUCTO:",
            error
        )

        return res.status(500).json({
            message:
                "Error obteniendo el producto",
            error: error.message
        })
    }
}


// =====================================================
// ACTUALIZAR PRODUCTO
// =====================================================

export const updateProduct = async (req, res) => {

    try {

        const { id } = req.params


        const producto =
            await Productos.findByPk(id)


        if (!producto) {

            return res.status(404).json({
                message:
                    "Producto no encontrado"
            })

        }


        const {
            nombre,
            descripcion,
            precio,
            genero,
            segmentacion,
            marca,
            stock,
            activo
        } = req.body


        const datosActualizar = {}


        if (nombre !== undefined) {
            datosActualizar.nombre =
                nombre.trim()
        }


        if (marca !== undefined) {
            datosActualizar.marca =
                marca.trim()
        }


        if (descripcion !== undefined) {
            datosActualizar.descripcion =
                descripcion.trim()
        }


        if (precio !== undefined) {
            datosActualizar.precio =
                Number(precio)
        }


        if (genero !== undefined) {
            datosActualizar.genero =
                genero
        }


        if (segmentacion !== undefined) {
            datosActualizar.segmentacion =
                segmentacion
        }


        if (stock !== undefined) {

            datosActualizar.stock =
                Number(stock)

        }


        if (activo !== undefined) {

            datosActualizar.activo =
                activo !== "false"

        }


        // ---------------------------------
        // SI SUBIÓ UNA NUEVA IMAGEN
        // ---------------------------------

        if (req.file) {

            datosActualizar.img =
                `/uploads/${req.file.filename}`

        }


        const productoActualizado =
            await producto.update(
                datosActualizar
            )


        return res.status(200).json(
            productoActualizado
        )


    } catch (error) {

        console.error(
            "ERROR ACTUALIZANDO PRODUCTO:",
            error
        )

        return res.status(500).json({
            message:
                "Error actualizando el producto",
            error: error.message
        })
    }
}


// =====================================================
// CAMBIAR ESTADO
// =====================================================

export const cambiarEstadoProducto =
    async (req, res) => {

        try {

            const { id } = req.params

            const { activo } = req.body


            const producto =
                await Productos.findByPk(id)


            if (!producto) {

                return res.status(404).json({
                    message:
                        "Producto no encontrado"
                })

            }


            await producto.update({
                activo: Boolean(activo)
            })


            return res.status(200).json({
                message:
                    "Estado actualizado correctamente",
                activo:
                    producto.activo
            })


        } catch (error) {

            console.error(
                "ERROR CAMBIANDO ESTADO:",
                error
            )

            return res.status(500).json({
                message:
                    "Error cambiando estado",
                error: error.message
            })
        }
    }


// =====================================================
// ELIMINAR PRODUCTO
// =====================================================

export const deletedProduct = async (req, res) => {

    try {

        const { id } = req.params


        const product =
            await Productos.findByPk(id)


        if (!product) {

            return res.status(404).json({
                message:
                    "Producto no encontrado"
            })

        }


        await product.destroy()


        return res.status(200).json({
            message:
                "Producto eliminado correctamente"
        })


    } catch (error) {

        console.error(
            "ERROR ELIMINANDO PRODUCTO:",
            error
        )

        return res.status(500).json({
            message:
                "Error eliminando producto",
            error: error.message
        })
    }
}