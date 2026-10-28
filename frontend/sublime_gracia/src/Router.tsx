import { Routes, Route } from "react-router-dom";

import App from "./App";
import Catalogo from "./page/catalogo";
import Carrito from "./page/carrito";
import Checkout from "./page/Checkout";
import Admin from "./page/Admin";
import Login from "./page/Login.tsx"
import Colonias from "./page/Colonias.tsx"
import Seguimiento from "./page/Seguimiento.tsx"
import Contacto from "./page/contacto.tsx";
import PromAnuncios from "./page/prom&anuncios.tsx";
import ProductoDetalle from "./page/ProductoDetalle";
import Gracias from "./page/Gracias";
import Politicas from "./page/Politicas";
import CasosExito from "./page/CasosExito";
import Envios from "./page/envios";
import NotFound from "./page/NotFound";
import ScrollToTop from './scrollToTop'


function Router() {

    return (
        <>
        <ScrollToTop />
        <Routes>

            {/* INICIO */}
            <Route
                path="/"
                element={<App />}
            />


            {/* CATÁLOGO */}
            <Route
                path="/catalogo"
                element={<Catalogo />}
            />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
            <Route path="/gracias/:id" element={<Gracias />} />

            {/* CARRITO */}
            <Route
                path="/carrito"
                element={<Carrito />}
            />

            {/* CHECKOUT */}
            <Route
                path="/checkout"
                element={<Checkout />}
            />

            <Route
                path="/seguimiento/:id"
                element={<Seguimiento />}
            />

            <Route
                path="/seguimiento"
                element={<Seguimiento />}
            />


            {/* Contacto */}
            <Route
            path="/contacto"
            element={<Contacto />}
            />
            <Route path="/envios" element={<Envios />} />
            <Route path="/privacidad" element={<Politicas />} />
            <Route path="/terminos" element={<Politicas />} />
            <Route path="/cookies" element={<Politicas />} />
            <Route path="/devoluciones" element={<Politicas />} />
            <Route path="/casos-exito" element={<CasosExito />} />

            {/* LOGIN */}
            <Route
                path="/login"
                element={<Login />}
            />

            {/* ADMIN */}
            <Route
                path="/admin"
                element={<Admin />}
            />

            <Route
                path="/admin/colonias"
                element={<Colonias />}
            />
            <Route
                path="/admin/colonias"
                element={<Colonias />}
            />
            <Route
                path="/admin/promos"
                element={<PromAnuncios />}
            />
            <Route path="*" element={<NotFound />} />
        </Routes>
        </>
    );
}

export default Router;
