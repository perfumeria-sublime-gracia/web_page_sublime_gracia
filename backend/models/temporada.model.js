import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const Temporada = db.define("temporada", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(120),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tema: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    colores: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    decoracion: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "none"
    },
    intensidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 0, max: 3 }
    },
    fechaInicio: {
        type: DataTypes.DATE,
        allowNull: false
    },
    fechaFin: {
        type: DataTypes.DATE,
        allowNull: false
    },
    habilitada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: "temporadas",
    indexes: [
        { fields: ["habilitada", "fechaInicio", "fechaFin"] }
    ]
});
