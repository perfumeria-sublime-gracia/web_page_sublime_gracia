import { Router } from "express";
import {
    listarClientes,
    obtenerPedidosCliente,
    obtenerDashboard,
    listarMovimientosInventario,
    registrarMovimientoInventario,
    registrarVentaPresencial
} from "../../controllers/adminOperations.controller.js";
import { verifyAdmin, verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();
const admin = [verifyToken, verifyAdmin];

router.get("/admin/dashboard", ...admin, obtenerDashboard);
router.get("/admin/inventario/movimientos", ...admin, listarMovimientosInventario);
router.post("/admin/inventario/movimientos", ...admin, registrarMovimientoInventario);
router.post("/admin/ventas-presenciales", ...admin, registrarVentaPresencial);
router.get("/admin/clientes", ...admin, listarClientes);
router.get("/admin/clientes/:email/pedidos", ...admin, obtenerPedidosCliente);

export default router;
