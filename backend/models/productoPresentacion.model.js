import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const ProductoPresentacion = db.define("productoPresentacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productoId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    mililitros: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1 }
    },
    precio: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: { min: 0.01 }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0 }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: "productoPresentaciones",
    indexes: [{ unique: true, fields: ["productoId", "mililitros"] }]
});
