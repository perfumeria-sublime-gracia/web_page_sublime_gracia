const colorKeys = ["principal", "secundario", "acento", "fondo", "texto", "boton", "decorativo"];
const allowedDecorations = ["none", "stars", "hearts", "snowflakes", "floral", "pumpkins", "confetti", "leaves", "lights", "web", "fireworks"];

export const parseBogotaDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) {
        return null;
    }
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, seconds = "0"] = timePart.split(/Z|[+-]/)[0].split(":");
    const parts = [year, month, day, Number(hour), Number(minute), Number(seconds)];
    const calendarCheck = new Date(0);
    calendarCheck.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
    calendarCheck.setUTCHours(parts[3], parts[4], parts[5], 0);
    if (calendarCheck.getUTCFullYear() !== parts[0] ||
        calendarCheck.getUTCMonth() !== parts[1] - 1 ||
        calendarCheck.getUTCDate() !== parts[2] ||
        parts[3] > 23 || parts[4] > 59 || parts[5] > 59) {
        return null;
    }
    const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    const date = new Date(hasTimeZone ? value : `${value}-05:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const validateSeasonInput = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Los datos de la temporada no son válidos." };
    }

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const tema = typeof body.tema === "string" ? body.tema.trim() : "";
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
    const fechaInicio = parseBogotaDate(body.fechaInicio);
    const fechaFin = parseBogotaDate(body.fechaFin);
    if (!nombre || nombre.length > 120 || !tema || tema.length > 80 || descripcion.length > 2000) {
        return { error: "Nombre, temática y descripción deben ser válidos (máximo 120, 80 y 2000 caracteres)." };
    }
    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
        return { error: "Las fechas deben ser válidas y la fecha de finalización debe ser posterior al inicio." };
    }
    if (!body.colores || typeof body.colores !== "object" || Array.isArray(body.colores) ||
        colorKeys.some((key) => typeof body.colores[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(body.colores[key]))) {
        return { error: "Configura los siete colores con valores hexadecimales válidos." };
    }
    if (!allowedDecorations.includes(body.decoracion)) {
        return { error: "El elemento decorativo seleccionado no es válido." };
    }
    const intensidad = body.intensidad === undefined ? 1 : body.intensidad;
    if (typeof intensidad !== "number" || !Number.isInteger(intensidad) || intensidad < 0 || intensidad > 3) {
        return { error: "La intensidad decorativa debe ser un valor entero entre 0 y 3." };
    }
    if (body.habilitada !== undefined && typeof body.habilitada !== "boolean") {
        return { error: "El estado de la temporada no es válido." };
    }

    return {
        value: {
            nombre,
            descripcion: descripcion || null,
            tema,
            colores: Object.fromEntries(colorKeys.map((key) => [key, body.colores[key].toLowerCase()])),
            decoracion: body.decoracion,
            intensidad,
            fechaInicio,
            fechaFin,
            habilitada: body.habilitada === true
        }
    };
};

export const seasonStatus = (season, now = new Date()) => {
    if (new Date(season.fechaFin) <= now) return "finalizada";
    if (!season.habilitada) return "inactiva";
    if (new Date(season.fechaInicio) > now) return "programada";
    return "activa";
};
