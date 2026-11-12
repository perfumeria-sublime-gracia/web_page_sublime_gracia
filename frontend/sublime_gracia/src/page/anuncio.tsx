import { useEffect, useState } from "react";
import axios from "axios";
import "../style/anuncio.css";
import { obtenerUrlImagen } from "../utils/imageUrl";

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

const Anuncios = () => {

    const API_URL = import.meta.env.VITE_API_URL;

    const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
    const [promociones, setPromociones] = useState<PromocionPublicitaria[]>([]);

    useEffect(() => {

        const obtenerAnuncios = async () => {

            try {

                const response = await axios.get(
                    `${API_URL}/api/anuncio`
                );

                setAnuncios(response.data);

            } catch (error) {

                console.error("Error al obtener anuncios:", error);

                // Si no hay anuncios o ocurre algún error,
                // no mostramos nada.
                setAnuncios([]);
            }
        };

        const obtenerPromociones = async () => {
            try {
                const response = await axios.get(`${API_URL}/promociones`);
                setPromociones(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Error al obtener las imágenes de promociones:", error);
                setPromociones([]);
            }
        };

        obtenerAnuncios();
        obtenerPromociones();

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
                    />

                </div>
            ))}
            {promocionesConImagen.map((promocion) => (
                <div className="anuncio" key={`promocion-${promocion.id}`}>
                    <img
                        src={obtenerUrlImagen(promocion.img)}
                        alt={`Promoción ${promocion.nombre}`}
                    />
                </div>
            ))}

        </section>
    );
};

export default Anuncios;