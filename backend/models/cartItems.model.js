import db from '../db/connect.js'
import Sequelize from 'sequelize'

const { DataTypes } = Sequelize

export const CartItem = db.define('cartItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    cartId: {
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
    }
})