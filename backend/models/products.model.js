import db from '../db/connect.js'
import Sequelize from 'sequelize'

const { DataTypes } = Sequelize

export const Productos = db.define('productos', {
    id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
    genero: {
        type: DataTypes.STRING,
        allowNull: false
    },
    segmentacion: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Otros"
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    marca: {
        type: DataTypes.STRING,
        allowNull: true
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: true
    },
    precio: {
        type: DataTypes.DOUBLE,
        allowNull: false
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
    },
    img: {
        type: DataTypes.STRING,
        allowNull: false
    }
})