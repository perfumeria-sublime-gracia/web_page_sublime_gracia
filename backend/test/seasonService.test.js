import test from "node:test";
import assert from "node:assert/strict";
import { parseBogotaDate, seasonStatus, validateSeasonInput } from "../services/temporada.service.js";

const validSeason = {
    nombre: "Navidad",
    tema: "Fiestas",
    descripcion: "",
    colores: {
        principal: "#315747",
        secundario: "#e5eee7",
        acento: "#a84a45",
        fondo: "#f7faf6",
        texto: "#27342c",
        boton: "#315747",
        decorativo: "#c8a86c"
    },
    decoracion: "snowflakes",
    intensidad: 2,
    fechaInicio: "2026-12-01T00:00",
    fechaFin: "2027-01-01T00:00"
};

test("interprets datetime-local values in the Bogota timezone", () => {
    assert.equal(parseBogotaDate("2026-12-01T00:00").toISOString(), "2026-12-01T05:00:00.000Z");
    assert.equal(parseBogotaDate("2026-12-01T00:00:00-05:00").toISOString(), "2026-12-01T05:00:00.000Z");
    assert.equal(parseBogotaDate("2026-12-01T00:00:00+02:00").toISOString(), "2026-11-30T22:00:00.000Z");
    assert.equal(parseBogotaDate("invalid"), null);
    assert.equal(parseBogotaDate("2026-02-30T12:00"), null);
});

test("validates complete season palettes and chronological dates", () => {
    const result = validateSeasonInput(validSeason);
    assert.equal(result.error, undefined);
    assert.equal(result.value.fechaInicio.toISOString(), "2026-12-01T05:00:00.000Z");

    assert.match(validateSeasonInput({ ...validSeason, fechaFin: validSeason.fechaInicio }).error, /posterior/);
    assert.match(validateSeasonInput({ ...validSeason, colores: { ...validSeason.colores, boton: "red" } }).error, /colores/);
    assert.match(validateSeasonInput({ ...validSeason, decoracion: "unknown" }).error, /decorativo/);
    assert.match(validateSeasonInput({ ...validSeason, intensidad: 4 }).error, /intensidad/);
    assert.match(validateSeasonInput({ ...validSeason, intensidad: "2" }).error, /intensidad/);
    assert.equal(validateSeasonInput({ ...validSeason, decoracion: "fireworks", intensidad: 0 }).value.intensidad, 0);
});

test("reports active, scheduled, inactive, and expired seasons", () => {
    const now = new Date("2026-12-15T12:00:00.000Z");
    const dates = {
        fechaInicio: new Date("2026-12-01T00:00:00.000Z"),
        fechaFin: new Date("2027-01-01T00:00:00.000Z")
    };
    assert.equal(seasonStatus({ ...dates, habilitada: true }, now), "activa");
    assert.equal(seasonStatus({ ...dates, fechaInicio: new Date("2026-12-20T00:00:00.000Z"), habilitada: true }, now), "programada");
    assert.equal(seasonStatus({ ...dates, habilitada: false }, now), "inactiva");
    assert.equal(seasonStatus({ ...dates, fechaFin: new Date("2026-12-10T00:00:00.000Z"), habilitada: false }, now), "finalizada");
});
