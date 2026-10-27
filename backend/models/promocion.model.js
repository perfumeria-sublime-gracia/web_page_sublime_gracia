import db from "../db/connect.js";
import Sequelize from "sequelize";

const { DataTypes } = Sequelize;

export const Promocion = db.define("promocion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM("PORCENTAJE", "MONTO", "2X1", "3X2"),
        allowNull: false
    },
    valor: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0
    },
    fechaInicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fechaFin: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    genero: {
        type: DataTypes.ENUM("TODOS", "HOMBRE", "MUJER"),
        allowNull: false,
        defaultValue: "TODOS"
    },
    prioridad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
});