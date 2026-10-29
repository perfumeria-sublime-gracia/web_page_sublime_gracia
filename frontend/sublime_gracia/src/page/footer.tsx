import "../style/footer.css"
import { Link, useNavigate } from "react-router-dom"

const Footer = () => {
    const navigate = useNavigate()
    return (
        <footer className="footer">

            <div className="footer-contenido">

                <div className="footer-marca">
                    <h2>
                        SUBLIME <span>GRACIA</span>
                    </h2>

                    <p>
                        El arte de una fragancia.
                        <br />
                        Una historia escrita en el aire.
                    </p>
                </div>


                <div className="footer-seccion">
                    <h3>Explorar</h3>

                    <Link to="/">Inicio</Link>
                    <Link to="/catalogo">Catálogo</Link>
                    <Link to="/#historia">Historia</Link>
                </div>


                <div className="footer-seccion">
                    <h3>Atención</h3>

                    <Link to="/contacto">Contacto</Link>
                    <Link to="/envios">Envíos y ubicación</Link>
                    <Link to={localStorage.getItem("ultimoPedidoId") ? `/seguimiento/${localStorage.getItem("ultimoPedidoId")}` : "/seguimiento"}>Seguimiento de pedido</Link>
                </div>


                <div className="footer-seccion">
                    <h3>Seguimos conectados</h3>

                    <p>
                        Descubre nuevas fragancias
                        <br />
                        y novedades de nuestra colección.
                    </p>

                    <div className="footer-redes">
                        <a href="https://www.instagram.com/sg_perfumeriasp?cplk=MWprOG94dGU4M2s0MA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="https://www.facebook.com/profile.php?id=61580902880617" target="_blank" rel="noopener noreferrer">Facebook</a>
                    </div>
                </div>

            </div>


            <div className="footer-linea"></div>


            <div className="footer-bottom">

                <p>
                    © 2026 Sublime Gracia. Todos los derechos reservados.
                </p>

                <button className="footer-admin-link" type="button" onClick={() => navigate('/login')}>Administración</button>

            </div>
            <nav className="footer-legal" aria-label="Información legal">
                <Link to="/privacidad">Privacidad</Link>
                <Link to="/terminos">Términos</Link>
                <Link to="/cookies">Cookies</Link>
                <Link to="/devoluciones">Cambios y devoluciones</Link>
                <Link to="/casos-exito">Experiencias</Link>
                <button type="button" onClick={() => window.dispatchEvent(new Event("cookie-preferences-open"))}>Preferencias de cookies</button>
            </nav>

        </footer>
    )
}

export default Footer