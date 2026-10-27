import db from '../db/connect.js'
import Sequelize from 'sequelize'

const { DataTypes } = Sequelize

export const Cart = db.define('carrito', {

    id: { 
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

})