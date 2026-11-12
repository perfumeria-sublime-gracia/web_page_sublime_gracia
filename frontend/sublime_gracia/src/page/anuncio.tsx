import { useEffect, useState } from "react";
import axios from "axios";
import "../style/anuncio.css";
import { marcarImagenNoDisponible, obtenerUrlImagen } from "../utils/imageUrl";

interface Anuncio {
    id: number;
    img: string;
}

interface PromocionPublicitaria {
    id: number;
    nombre: string;
    img: string | null;
    activa: boolean;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim()
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
const API_URL = `${API_BASE_URL}/api`;

const Anuncios = () => {

    const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
    const [promociones, setPromociones] = useState<PromocionPublicitaria[]>([]);

    useEffect(() => {
        let cancelado = false;

        const obtenerAnuncios = async () => {

            try {

                const response = await axios.get(
                    `${API_URL}/anuncio`
                );

                if (!cancelado) {
                    setAnuncios(Array.isArray(response.data) ? response.data : []);
                }

            } catch (error) {

                console.error("Error al obtener anuncios:", error);

                // Si no hay anuncios o ocurre algún error,
                // no mostramos nada.
                if (!cancelado) setAnuncios([]);
            }
        };

        const obtenerPromociones = async () => {
            try {
                const response = await axios.get(`${API_URL}/promociones`);
                if (!cancelado) {
                    setPromociones(Array.isArray(response.data) ? response.data : []);
                }
            } catch (error) {
                console.error("Error al obtener las imágenes de promociones:", error);
                if (!cancelado) setPromociones([]);
            }
        };

        obtenerAnuncios();
        obtenerPromociones();

        return () => {
            cancelado = true;
        };
    }, []);

    // Si no hay anuncios, no renderizamos nada
    const promocionesConImagen = promociones.filter((promocion) => promocion.activa && promocion.img);
    if (anuncios.length === 0 && promocionesConImagen.length === 0) {
        return null;
    }

    return (
        <section className="anuncios">

            {anuncios.map((anuncio) => (
                <div className="anuncio" key={anuncio.id}>

                    <img
                        src={obtenerUrlImagen(anuncio.img)}
                        alt="Anuncio"
                        onError={marcarImagenNoDisponible}
                    />

                </div>
            ))}
            {promocionesConImagen.map((promocion) => (
                <div className="anuncio" key={`promocion-${promocion.id}`}>
                    <img
                        src={obtenerUrlImagen(promocion.img)}
                        alt={`Promoción ${promocion.nombre}`}
                        onError={marcarImagenNoDisponible}
                    />
                </div>
            ))}

        </section>
    );
};

export default Anuncios;