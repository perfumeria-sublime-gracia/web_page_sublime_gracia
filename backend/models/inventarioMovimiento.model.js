import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const InventarioMovimiento = db.define("inventarioMovimiento", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    productoId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    presentacionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    pedidoId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    tipo: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stockAnterior: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stockNuevo: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    motivo: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: "inventarioMovimientos",
    indexes: [
        { fields: ["productoId", "createdAt"] },
        { fields: ["pedidoId", "tipo"] }
    ]
});
