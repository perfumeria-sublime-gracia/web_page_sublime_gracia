import db from '../db/connect.js'
import Sequelize from 'sequelize'

const { DataTypes } = Sequelize

export const Anuncio = db.define('anuncio', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    img: {
        type: DataTypes.TEXT,
        allowNull: false
    }
})