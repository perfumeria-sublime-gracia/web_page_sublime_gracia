import { useEffect, type ReactNode } from "react";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "https://web-page-sublime-gracia.onrender.com")
    .trim()
    .replace(/\/+$/, "");

const themeProperties: Record<string, string> = {
    principal: "--brand-brown",
    secundario: "--brand-cream",
    acento: "--brand-gold",
    fondo: "--brand-paper",
    texto: "--brand-ink",
    boton: "--brand-deep",
    decorativo: "--brand-champagne",
};
const allowedDecorations = new Set([
    "none", "stars", "hearts", "snowflakes", "floral", "pumpkins",
    "confetti", "leaves", "lights", "web", "fireworks",
]);

const clearTheme = () => {
    for (const property of Object.values(themeProperties)) {
        document.documentElement.style.removeProperty(property);
    }
    document.documentElement.style.removeProperty("--brand-hover");
    document.documentElement.style.removeProperty("--brand-border");
    document.documentElement.style.removeProperty("--brand-surface");
    document.documentElement.style.removeProperty("--brand-muted");
    document.body.removeAttribute("data-season-decoration");
    document.body.removeAttribute("data-season-intensity");
    document.body.removeAttribute("data-season-active");
};

const applyTheme = (season: unknown) => {
    if (!season || typeof season !== "object") {
        clearTheme();
        return;
    }

    const data = season as { colores?: Record<string, unknown>; decoracion?: unknown; intensidad?: unknown };
    if (!data.colores) {
        throw new Error("La API devolvió una paleta de temporada inválida.");
    }
    if (typeof data.decoracion !== "string" || !allowedDecorations.has(data.decoracion) ||
        !Number.isInteger(data.intensidad) || (data.intensidad as number) < 0 || (data.intensidad as number) > 3) {
        throw new Error("La API devolvió opciones decorativas inválidas.");
    }

    for (const [key, property] of Object.entries(themeProperties)) {
        const color = data.colores[key];
        if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) {
            throw new Error("La API devolvió una paleta de temporada inválida.");
        }
        document.documentElement.style.setProperty(property, color);
    }
    const root = document.documentElement.style;
    root.setProperty("--brand-hover", `color-mix(in srgb, ${data.colores.principal} 70%, black)`);
    root.setProperty("--brand-surface", `color-mix(in srgb, ${data.colores.fondo} 88%, ${data.colores.secundario})`);
    root.setProperty("--brand-border", `color-mix(in srgb, ${data.colores.decorativo} 26%, ${data.colores.fondo})`);
    root.setProperty("--brand-muted", `color-mix(in srgb, ${data.colores.texto} 62%, ${data.colores.fondo})`);
    document.body.setAttribute("data-season-active", "true");
    if (typeof data.decoracion === "string" && data.decoracion !== "none") {
        document.body.setAttribute("data-season-decoration", data.decoracion);
        document.body.setAttribute("data-season-intensity", String(data.intensidad));
    } else {
        document.body.removeAttribute("data-season-decoration");
    }
};

export default function SeasonThemeProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const refreshTheme = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/temporadas/activa`, { signal: controller.signal });
                if (!response.ok) throw new Error(`No se pudo consultar la temporada activa (${response.status}).`);
                const season: unknown = await response.json();
                if (mounted) applyTheme(season);
            } catch (error) {
                if (mounted && !(error instanceof DOMException && error.name === "AbortError")) {
                    clearTheme();
                    console.error("No se pudo actualizar el tema estacional.", error);
                }
            }
        };

        void refreshTheme();
        const interval = window.setInterval(() => void refreshTheme(), 60_000);
        return () => {
            mounted = false;
            controller.abort();
            window.clearInterval(interval);
            clearTheme();
        };
    }, []);

    return <>{children}</>;
}
