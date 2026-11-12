import app from './app.js'
import sequelize from '../db/connect.js'
import '../models/associations.js'
import "dotenv/config"


const PORT = process.env.PORT
const server  = async () => {
    try {
        console.log('conectando a la base de datos')
        await sequelize.authenticate()
        await sequelize.sync({ force: false })

        await sequelize.query(`
            ALTER TABLE "productos"
            ADD COLUMN IF NOT EXISTS "marca" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "stock" INTEGER,
            ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true
        `)

        await sequelize.query(`
            ALTER TABLE "reseñas"
            ADD COLUMN IF NOT EXISTS "productoId" INTEGER
                REFERENCES "productos" ("id") ON DELETE CASCADE
        `)

        await sequelize.query(`
            ALTER TABLE "cartItems"
            ADD COLUMN IF NOT EXISTS "presentacionId" INTEGER
        `)

        await sequelize.query(`
            ALTER TABLE "pedidoItems"
            ADD COLUMN IF NOT EXISTS "nombreProducto" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "imagenProducto" TEXT,
            ADD COLUMN IF NOT EXISTS "presentacionId" INTEGER,
            ADD COLUMN IF NOT EXISTS "mililitros" INTEGER
        `)

        await sequelize.query(`
            DO $$
            DECLARE enum_type TEXT;
            BEGIN
                SELECT pg_type.typname INTO enum_type
                FROM pg_type
                JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
                JOIN pg_attribute ON pg_attribute.atttypid = pg_type.oid
                JOIN pg_class ON pg_class.oid = pg_attribute.attrelid
                WHERE pg_class.relname = 'pedidos'
                  AND pg_attribute.attname = 'estado'
                LIMIT 1;

                IF enum_type IS NOT NULL THEN
                    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''preparando''', enum_type);
                    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''enviado''', enum_type);
                    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''entregado''', enum_type);
                END IF;
            END $$;
        `)

        await sequelize.query(`
            ALTER TABLE "pedidos"
            ADD COLUMN IF NOT EXISTS "comentarioCancelacion" TEXT,
            ADD COLUMN IF NOT EXISTS "canalVenta" VARCHAR(20) NOT NULL DEFAULT 'web',
            ADD COLUMN IF NOT EXISTS "metodoPago" VARCHAR(30)
        `)

        await sequelize.query(`
            ALTER TABLE "promocions"
            ADD COLUMN IF NOT EXISTS "img" TEXT,
            ADD COLUMN IF NOT EXISTS "seleccionEspecifica" BOOLEAN NOT NULL DEFAULT false
        `)

        await sequelize.query(`
            ALTER TABLE "reseñas"
            ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true
        `)

        await sequelize.query(`
            INSERT INTO "productoPresentaciones" ("productoId", "mililitros", "precio", "stock", "activo", "createdAt", "updatedAt")
            SELECT p."id", NULL, p."precio", p."stock", p."activo", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM "productos" p
            WHERE NOT EXISTS (
                SELECT 1 FROM "productoPresentaciones" pp WHERE pp."productoId" = p."id"
            )
        `)

        console.log('conexion lista')

        app.listen(PORT, () => {
            console.log(`servidor corriendo en el puerto http://localhost:${PORT}`)
        })
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

server()