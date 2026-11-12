import app from './app.js'
import sequelize from '../db/connect.js'
import '../models/associations.js'
import { Temporada } from '../models/temporada.model.js'
import { finalizarTemporadasVencidas } from '../controllers/temporada.controller.js'
import "dotenv/config"


const PORT = process.env.PORT
const server  = async () => {
    try {
        console.log('conectando a la base de datos')
        await sequelize.authenticate()
        await sequelize.sync({ force: false })
        await Temporada.sync({ alter: false })

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
            CREATE TABLE IF NOT EXISTS "temporadas" (
                "id" SERIAL PRIMARY KEY,
                "nombre" VARCHAR(120) NOT NULL,
                "descripcion" TEXT,
                "tema" VARCHAR(80) NOT NULL,
                "colores" JSONB NOT NULL,
                "decoracion" VARCHAR(30) NOT NULL DEFAULT 'none',
                "intensidad" INTEGER NOT NULL DEFAULT 1,
                "fechaInicio" TIMESTAMPTZ NOT NULL,
                "fechaFin" TIMESTAMPTZ NOT NULL,
                "habilitada" BOOLEAN NOT NULL DEFAULT false,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "temporadas_fecha_valida" CHECK ("fechaFin" > "fechaInicio")
            )
        `)
        await sequelize.query(`
            ALTER TABLE "temporadas"
            ADD COLUMN IF NOT EXISTS "intensidad" INTEGER NOT NULL DEFAULT 1
        `)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "temporadas_habilitada_fechaInicio_fechaFin"
            ON "temporadas" ("habilitada", "fechaInicio", "fechaFin")
        `)
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'temporadas_fecha_valida'
                      AND conrelid = '"temporadas"'::regclass
                ) THEN
                    ALTER TABLE "temporadas"
                    ADD CONSTRAINT "temporadas_fecha_valida" CHECK ("fechaFin" > "fechaInicio");
                END IF;
            END $$;
        `)
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'temporadas_intensidad_valida'
                      AND conrelid = '"temporadas"'::regclass
                ) THEN
                    ALTER TABLE "temporadas"
                    ADD CONSTRAINT "temporadas_intensidad_valida"
                    CHECK ("intensidad" BETWEEN 0 AND 3);
                END IF;
            END $$;
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
        await finalizarTemporadasVencidas()
        setInterval(() => {
            finalizarTemporadasVencidas().catch((error) => {
                console.error('No se pudieron finalizar las temporadas vencidas.', error)
            })
        }, 60_000)

        app.listen(PORT, () => {
            console.log(`servidor corriendo en el puerto http://localhost:${PORT}`)
        })
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

server()