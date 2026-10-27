import db from '../db/connect.js'
import Sequelize from 'sequelize'

const { DataTypes } = Sequelize

export const Reseñas = db.define('reseñas', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    opinion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    calificacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
    },
    productoId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
})