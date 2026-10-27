import { Promocion } from "../models/promocion.model.js";

const inicioDelDia = (fecha) => new Date(`${fecha}T00:00:00`);
const fechaLocalActual = () => {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    return `${ahora.getFullYear()}-${mes}-${dia}`;
};

export const obtenerPromocionesVigentes = async () => {
    const hoy = fechaLocalActual();
    return Promocion.findAll({
        where: {
            activa: true,
            fechaInicio: { $lte: hoy },
            fechaFin: { $gte: hoy }
        },
        include: [
            { association: "productos", required: false },
            { association: "presentaciones", required: false }
        ],
        order: [["prioridad", "DESC"], ["createdAt", "ASC"]]
    });
};

const promocionAplica = (promocion, producto, presentacion) => {
    if (promocion.genero !== "TODOS" && promocion.genero !== String(producto.genero).toUpperCase()) {
        return false;
    }

    const productos = promocion.productos || [];
    const presentaciones = promocion.presentaciones || [];
    const productoElegible = productos.length === 0 || productos.some((item) => item.id === producto.id);
    const presentacionElegible = presentaciones.length === 0 || presentaciones.some((item) => item.id === presentacion?.id);
    return productoElegible && presentacionElegible;
};

const calcularBeneficio = (precio, cantidad, promocion) => {
    const unidades = Math.max(1, Number(cantidad) || 1);

    if (promocion.tipo === "PORCENTAJE") {
        const descuento = Math.min(100, Number(promocion.valor)) / 100;
        return precio * unidades * descuento;
    }

    if (promocion.tipo === "MONTO") {
        return Math.min(precio, Number(promocion.valor)) * unidades;
    }

    if (promocion.tipo === "2X1") {
        return Math.floor(unidades / 2) * precio;
    }

    if (promocion.tipo === "3X2") {
        return Math.floor(unidades / 3) * precio;
    }

    return 0;
};

export const calcularPrecioPromocional = (producto, cantidad = 1, promociones = []) => {
    const presentacion = producto.presentacion || null;
    const precioOriginal = Number(presentacion?.precio ?? producto.precio);
    const unidades = Math.max(1, Number(cantidad) || 1);
    const aplicables = promociones.filter((promocion) => promocionAplica(promocion, producto, presentacion));
    const promocion = aplicables
        .map((item) => ({ item, beneficio: calcularBeneficio(precioOriginal, unidades, item) }))
        .sort((a, b) => b.beneficio - a.beneficio || Number(b.item.prioridad) - Number(a.item.prioridad))[0]?.item;

    const descuento = promocion ? calcularBeneficio(precioOriginal, unidades, promocion) : 0;
    const totalOriginal = precioOriginal * unidades;
    const totalFinal = Math.max(0, totalOriginal - descuento);

    return {
        precioOriginal,
        precioFinal: unidades ? totalFinal / unidades : precioOriginal,
        descuento,
        porcentajeDescuento: totalOriginal ? (descuento / totalOriginal) * 100 : 0,
        totalOriginal,
        totalFinal,
        cantidad: unidades,
        tienePromocion: Boolean(promocion && descuento > 0),
        promocion: promocion || null
    };
};

export const validarPromocion = (datos) => {
    const tipos = ["PORCENTAJE", "MONTO", "2X1", "3X2"];
    const generos = ["TODOS", "HOMBRE", "MUJER"];
    if (!datos.nombre?.trim() || !tipos.includes(datos.tipo) || !generos.includes(datos.genero)) {
        return "Nombre, tipo y genero son obligatorios y deben ser validos";
    }
    if (!datos.fechaInicio || !datos.fechaFin || inicioDelDia(datos.fechaFin) < inicioDelDia(datos.fechaInicio)) {
        return "El rango de fechas no es valido";
    }
    const valor = Number(datos.valor || 0);
    if ((datos.tipo === "PORCENTAJE" && (valor < 1 || valor > 100)) || (datos.tipo === "MONTO" && valor <= 0)) {
        return "El valor de la promocion no es valido";
    }
    if (!Number.isInteger(Number(datos.prioridad || 0)) || Number(datos.prioridad || 0) < 0) {
        return "La prioridad no es valida";
    }
    return null;
};