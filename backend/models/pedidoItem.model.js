import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const PedidoItem = db.define("pedidoItem", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    pedidoId: {
        type: DataTypes.UUID,
        allowNull: false
    },

    productId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    presentacionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    mililitros: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },

    precio: {
        type: DataTypes.DOUBLE,
        allowNull: false
    },

    nombreProducto: {
        type: DataTypes.STRING,
        allowNull: true
    },

    imagenProducto: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});