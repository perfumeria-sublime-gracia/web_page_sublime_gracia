import "../style/historia.css"
import fotoHistoria from "/img/PerfumeSG.png"

const Historia = () => {
    return (
        <section className="historia">

            <div className="historia-contenido">

                {/* TEXTO */}

                <div className="historia-texto">

                    <span className="historia-etiqueta">
                        SOBRE NOSOTROS
                    </span>

                    <h1>
                        Sublime <span>Gracia</span>
                    </h1>

                    <div className="historia-descripcion">

                        <p>
                            Somos una perfumería para quienes valoran la belleza
                            en los pequeños detalles. Encuentra aromas que te
                            acompañan y cuentan tu historia.
                        </p>

                    </div>
                    <p className="historia-frase">Tu esencia, Tu firma</p>

                </div>

                {/* IMAGEN */}

                <div className="historia-imagen">
                    <img
                        src={fotoHistoria}
                        alt="Frasco de perfume de la colección Sublime Gracia"
                        loading="lazy"
                    />
                </div>

            </div>

        </section>
    )
}

export default Historia