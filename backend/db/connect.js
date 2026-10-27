import { Sequelize } from 'sequelize'
import 'dotenv/config'

const sequelize = new Sequelize(process.env.DATA_BASE_URL, {
	dialect: 'postgres',
	logging: false, // Desactiva los logs de 
        dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
})

export default sequelize 