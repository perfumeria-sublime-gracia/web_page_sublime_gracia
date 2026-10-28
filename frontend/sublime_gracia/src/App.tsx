import "./App.css";
import { Link } from "react-router-dom";
import Historia from "./page/historia";
import Anuncios from "./page/anuncio";
import FeaturedProducts from "./page/FeaturedProducts";
import fotoParaElla from "../uploads/COCO MADEMOISELLE.webp";
import fotoParaEl from "../uploads/solo.webp";
import fotoUnisex from "../uploads/Buongiorno.jpg";

const Home = () => (
    <main className="home-page">
        <section className="app home-hero">
            <div className="home-hero-copy">
                <span className="home-eyebrow">Descubre tu esencia</span>
                <h1 className="titulo">
                    Fragancias que
                    <br />
                    <span>cuentan historias</span>
                </h1>
                <p>
                    En Sublime Gracia encontrarás aromas para acompañar tu estilo
                    y resaltar lo mejor de ti en cada momento.
                </p>
                <div className="botones">
                    <Link className="iz" to="/catalogo">Explorar perfumes <span aria-hidden="true">→</span></Link>
                    <a className="de" href="#historia">Conoce nuestra historia</a>
                </div>
            </div>
            <div className="home-hero-art" aria-hidden="true">
                <img src={fotoUnisex} alt="" />
                <span className="home-hero-caption">Tu esencia <br /> Tu firma</span>
            </div>
        </section>

        <Anuncios />

        <section className="home-categories" aria-labelledby="home-categories-title">
            <div className="home-section-heading">
                <span className="home-eyebrow">Encuentra tu aroma</span>
                <h2 id="home-categories-title">Una esencia para cada momento</h2>
            </div>
            <div className="home-category-grid">
                <Link className="home-category-card" to="/catalogo?genero=MUJER">
                    <span className="home-category-image"><img src={fotoParaElla} alt="" loading="lazy" /></span>
                    <span className="home-category-label">Para ella</span>
                    <span className="home-category-arrow" aria-hidden="true">→</span>
                </Link>
                <Link className="home-category-card" to="/catalogo?genero=HOMBRE">
                    <span className="home-category-image"><img src={fotoParaEl} alt="" loading="lazy" /></span>
                    <span className="home-category-label">Para él</span>
                    <span className="home-category-arrow" aria-hidden="true">→</span>
                </Link>
                <Link className="home-category-card" to="/catalogo?genero=UNISEX">
                    <span className="home-category-image"><img src={fotoUnisex} alt="" loading="lazy" /></span>
                    <span className="home-category-label">Unisex</span>
                    <span className="home-category-arrow" aria-hidden="true">→</span>
                </Link>
            </div>
        </section>

        <FeaturedProducts />

        <div id="historia">
            <Historia />
        </div>

        <section className="home-service-band" aria-label="Información de envíos">
            <article>
                <span aria-hidden="true">01</span>
                <div>
                    <h2>Envíos gratuitos</h2>
                    <p>En San Pedro, corregimientos cercanos y veredas.</p>
                </div>
            </article>
            <article>
                <span aria-hidden="true">02</span>
                <div>
                    <h2>Otros destinos</h2>
                    <p>Pago contraentrega.</p>
                </div>
            </article>
            <Link to="/envios">Conoce las condiciones <span aria-hidden="true">→</span></Link>
        </section>
    </main>
);

export default Home;
