import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const Pedido = db.define("pedido", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },

    telefono: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false
    },

    direccion: {
        type: DataTypes.STRING,
        allowNull: false
    },

    ciudad: {
        type: DataTypes.STRING,
        allowNull: false
    },

    total: {
        type: DataTypes.DOUBLE,
        allowNull: false
    },

    estado: {
        type: DataTypes.ENUM(
            "pendiente",
            "pagado",
            "preparando",
            "enviado",
            "entregado",
            "rechazado",
            "cancelado"
        ),
        defaultValue: "pendiente",
        allowNull: false
    },

    referencia: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },

    comprobante: {
        type: DataTypes.STRING,
        allowNull: true
    },

    comentarioCancelacion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});