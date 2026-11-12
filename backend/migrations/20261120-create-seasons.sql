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
    CONSTRAINT "temporadas_fecha_valida" CHECK ("fechaFin" > "fechaInicio"),
    CONSTRAINT "temporadas_intensidad_valida" CHECK ("intensidad" BETWEEN 0 AND 3)
);

ALTER TABLE "temporadas"
    ADD COLUMN IF NOT EXISTS "intensidad" INTEGER NOT NULL DEFAULT 1;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'temporadas_intensidad_valida'
          AND conrelid = '"temporadas"'::regclass
    ) THEN
        ALTER TABLE "temporadas"
        ADD CONSTRAINT "temporadas_intensidad_valida" CHECK ("intensidad" BETWEEN 0 AND 3);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "temporadas_habilitada_fechaInicio_fechaFin"
    ON "temporadas" ("habilitada", "fechaInicio", "fechaFin");
