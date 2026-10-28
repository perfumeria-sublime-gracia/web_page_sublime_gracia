import { Login } from "../../controllers/login.controller.js";
import { Router } from 'express'
import { rateLimit } from '../../middlewares/security.middleware.js'

const router = Router()

router.post('/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: "Has alcanzado el límite de 5 intentos fallidos. Intenta de nuevo más tarde."
}), Login)


export default router 