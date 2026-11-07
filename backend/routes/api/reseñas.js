import { Router } from "express";
import { createReseña, getReseñas } from '../../controllers/reseñas.controller.js'
import { cambiarEstadoOpinion, eliminarOpinion, listarOpinionesAdmin } from "../../controllers/adminOperations.controller.js";
import { verifyAdmin, verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router()

router.post('/opiniones', createReseña)
router.get('/opiniones', getReseñas)
router.get('/admin/opiniones', verifyToken, verifyAdmin, listarOpinionesAdmin)
router.patch('/admin/opiniones/:id/estado', verifyToken, verifyAdmin, cambiarEstadoOpinion)
router.delete('/admin/opiniones/:id', verifyToken, verifyAdmin, eliminarOpinion)

export default router