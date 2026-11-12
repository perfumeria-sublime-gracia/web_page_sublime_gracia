import express from "express";
import {
    listarPromociones,
    obtenerPromocion,
    crearPromocion,
    actualizarPromocion,
    cambiarEstadoPromocion,
    eliminarPromocion
} from "../../controllers/promocion.controller.js";
import { verifyAdmin, verifyToken } from "../../middlewares/auth.middleware.js";
import { uploadImagenProducto } from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/promociones", listarPromociones);
router.get("/promociones/:id", obtenerPromocion);
router.post("/promociones", verifyToken, verifyAdmin, uploadImagenProducto.single("imagen"), crearPromocion);
router.put("/promociones/:id", verifyToken, verifyAdmin, uploadImagenProducto.single("imagen"), actualizarPromocion);
router.patch("/promociones/:id/estado", verifyToken, verifyAdmin, cambiarEstadoPromocion);
router.delete("/promociones/:id", verifyToken, verifyAdmin, eliminarPromocion);

export default router;