const ventanas = new Map();

export const securityHeaders = (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: http://localhost:3000; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:3000");
    next();
};

export const rateLimit = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    skipSuccessfulRequests = false,
    message = "Demasiadas solicitudes. Intenta más tarde."
} = {}) => (req, res, next) => {
    const ahora = Date.now();
    const clave = `${req.ip}:${req.path}`;
    const anterior = ventanas.get(clave);
    const ventana = !anterior || ahora - anterior.inicio >= windowMs
        ? { inicio: ahora, cantidad: 0 }
        : anterior;

    if (skipSuccessfulRequests) {
        if (ventana.cantidad >= max) {
            return res.status(429).json({ message });
        }

        ventana.cantidad += 1;
        ventanas.set(clave, ventana);

        res.on("finish", () => {
            if (res.statusCode < 400 && ventanas.get(clave) === ventana) {
                ventana.cantidad -= 1;
            }
        });

        return next();
    }

    ventana.cantidad += 1;
    ventanas.set(clave, ventana);

    if (ventana.cantidad > max) {
        return res.status(429).json({ message });
    }

    next();
};