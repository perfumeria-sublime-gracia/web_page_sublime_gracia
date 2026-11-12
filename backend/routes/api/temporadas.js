import { Router } from "express";
import {
    actualizarTemporada,
    cambiarEstadoTemporada,
    crearTemporada,
    eliminarTemporada,
    listarTemporadas,
    obtenerTemporadaActiva
} from "../../controllers/temporada.controller.js";
import { verifyAdmin, verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();
const admin = [verifyToken, verifyAdmin];

router.get("/temporadas/activa", obtenerTemporadaActiva);
router.get("/admin/temporadas", ...admin, listarTemporadas);
router.post("/admin/temporadas", ...admin, crearTemporada);
router.put("/admin/temporadas/:id", ...admin, actualizarTemporada);
router.patch("/admin/temporadas/:id/estado", ...admin, cambiarEstadoTemporada);
router.delete("/admin/temporadas/:id", ...admin, eliminarTemporada);

export default router;
