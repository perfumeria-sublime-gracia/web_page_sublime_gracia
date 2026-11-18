import axios from "axios"
import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import '../style/catalogo.css'
import { marcarImagenNoDisponible, obtenerUrlImagen } from "../utils/imageUrl"
import { guardarCartId, headersCarrito } from "../utils/cartId"
import { Link } from "react-router-dom"

interface Item {
    id: number
    nombre: string
    genero: string
    segmentacion: string
    descripcion: string
    precio: number
    img: string
    stock?: number | null
    activo?: boolean
    precioOriginal?: number
    precioFinal?: number
    descuento?: number
    porcentajeDescuento?: number
    tienePromocion?: boolean
    promocion?: { nombre: string; tipo: string } | null
    presentaciones?: Presentacion[]
}

interface Presentacion {
    id: number
    mililitros: number | null
    precio: number
    precioFinal?: number
    stock: number | null
    activo: boolean
    tienePromocion?: boolean
    porcentajeDescuento?: number
}

const Catalogo = () => {

    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [items, setItems] = useState<Item[]>([])
    const [productosCompatibilidad, setProductosCompatibilidad] = useState<Item[] | null>(null)
    const [categorias, setCategorias] = useState<string[]>([])
    const [busqueda, setBusqueda] = useState("")
    const [hayMas, setHayMas] = useState(false)
    const [cargando, setCargando] = useState(true)
    const [cargandoMas, setCargandoMas] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [categoria, setCategoria] = useState("todo")
    const [genero, setGenero] = useState(() => {
        const generoInicial = searchParams.get("genero")?.toUpperCase()
        return generoInicial && ["HOMBRE", "MUJER", "UNISEX"].includes(generoInicial)
            ? generoInicial
            : "todos"
    })
    const [presentacionSeleccionada, setPresentacionSeleccionada] = useState<Record<number, number>>({})
    const [mensajeCarrito, setMensajeCarrito] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null)
    const mensajeTimeout = useRef<number | undefined>(undefined)
    const solicitudCatalogo = useRef(0)

    const API_URL = `${import.meta.env.VITE_API_URL}/api`

    useEffect(() => {
        let cancelado = false
        const controller = new AbortController()
        const solicitud = ++solicitudCatalogo.current
        const textoBusqueda = busqueda.trim()

        setItems([])
        setProductosCompatibilidad(null)
        setHayMas(false)
        setError(null)
        setCargando(true)

        const cargarCatalogo = async () => {
            try {
                const res = await axios.get(`${API_URL}/catalogo`, {
                    params: {
                        pagina: 1,
                        ...(textoBusqueda ? { busqueda: textoBusqueda } : {}),
                        ...(categoria !== "todo" ? { categoria } : {}),
                        ...(genero !== "todos" ? { genero } : {})
                    },
                    signal: controller.signal
                })

                if (Array.isArray(res.data)) {
                    if (textoBusqueda) {
                        throw new Error("El servidor no admite búsquedas del catálogo.")
                    }

                    const productosFiltrados = res.data.filter((item: Item) => {
                        const coincideCategoria = categoria === "todo" || item.segmentacion === categoria
                        const coincideGenero = genero === "todos" || item.genero.trim().toUpperCase() === genero
                        return coincideCategoria && coincideGenero
                    })
                    if (cancelado || solicitud !== solicitudCatalogo.current) return
                    setProductosCompatibilidad(productosFiltrados)
                    setItems(productosFiltrados.slice(0, 20))
                    setCategorias([...new Set(res.data.map((item: Item) => item.segmentacion).filter(Boolean))])
                    setHayMas(productosFiltrados.length > 20)
                    return
                }

                if (!Array.isArray(res.data?.productos)) {
                    throw new Error(res.data?.message || "La respuesta del catálogo no tiene un formato válido")
                }

                if (cancelado || solicitud !== solicitudCatalogo.current) return
                setProductosCompatibilidad(null)
                setItems(res.data.productos)
                setCategorias(Array.isArray(res.data.categorias) ? res.data.categorias : [])
                setHayMas(res.data.hayMas === true)
            } catch (error: unknown) {
                if (!cancelado && !controller.signal.aborted && solicitud === solicitudCatalogo.current) {
                    setItems([])
                    setCategorias([])
                    setHayMas(false)
                    const errorAxios = axios.isAxiosError(error) ? error : null
                    setError(errorAxios?.response?.data?.message || (error instanceof Error ? error.message : "Error obteniendo productos"))
                }
            } finally {
                if (!cancelado && solicitud === solicitudCatalogo.current) setCargando(false)
            }
        }

        const timeout = window.setTimeout(cargarCatalogo, textoBusqueda ? 300 : 0)

        return () => {
            cancelado = true
            window.clearTimeout(timeout)
            controller.abort()
        }
    }, [API_URL, busqueda, categoria, genero])

    const cargarMas = async () => {
        if (!hayMas || cargandoMas) return

        setCargandoMas(true)
        setError(null)
        const solicitud = solicitudCatalogo.current
        try {
            if (productosCompatibilidad) {
                const siguienteLote = productosCompatibilidad.slice(items.length, items.length + 20)
                setItems((actuales) => [...actuales, ...siguienteLote])
                setHayMas(items.length + siguienteLote.length < productosCompatibilidad.length)
                return
            }

            const pagina = Math.floor(items.length / 20) + 1
            const response = await axios.get(`${API_URL}/catalogo`, {
                params: {
                    pagina,
                    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
                    ...(categoria !== "todo" ? { categoria } : {}),
                    ...(genero !== "todos" ? { genero } : {})
                }
            })
            if (solicitud !== solicitudCatalogo.current) return
            const productos = Array.isArray(response.data)
                ? response.data
                : response.data?.productos
            if (!Array.isArray(productos)) {
                throw new Error(response.data?.message || "La respuesta del catálogo no tiene un formato válido")
            }
            setItems((actuales) => [...actuales, ...productos])
            setHayMas(Array.isArray(response.data) ? false : response.data.hayMas === true)
        } catch (error: any) {
            if (solicitud === solicitudCatalogo.current) {
                setError(error.response?.data?.message || error.message)
            }
        } finally {
            setCargandoMas(false)
        }
    }

    const obtenerCategoria = (seg: string) => {
        setCargando(true)
        setError(null)
        setItems([])
        setProductosCompatibilidad(null)
        setHayMas(false)
        setCategoria(seg)
    }

    const obtenerGenero = (nuevoGenero: string) => {
        setCargando(true)
        setError(null)
        setItems([])
        setProductosCompatibilidad(null)
        setHayMas(false)
        setGenero(nuevoGenero)
    }

    const mostrarMensajeCarrito = (tipo: "exito" | "error", texto: string) => {
        if (mensajeTimeout.current) window.clearTimeout(mensajeTimeout.current)
        setMensajeCarrito({ tipo, texto })
        mensajeTimeout.current = window.setTimeout(() => {
            setMensajeCarrito(null)
            mensajeTimeout.current = undefined
        }, 3000)
    }

const agregarAlCarrito = async (productId: number, presentacionId?: number) => {

    try {

        const response = await axios.post(
            `${API_URL}/cart/items`,
            {
                productId: productId,
                presentacionId,
                quantity: 1
            },
            {
                withCredentials: true,
                headers: headersCarrito()
            }
        )

        guardarCartId(response.data.cartId)

        setError(null)
        mostrarMensajeCarrito("exito", "El producto se añadió al carrito.")

    } catch (error: any) {

        console.error(error)

        const mensaje = error.response?.data?.message || "No se pudo agregar el producto al carrito"
        setError(mensaje)
        mostrarMensajeCarrito("error", mensaje)
    }
}

    return (
        <div className="catalogo">
                
            <h1>Nuestras Fragancias</h1>

            <div className="buscador-catalogo">
                <input
                    type="search"
                    placeholder="Buscar una fragancia..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    aria-label="Buscar fragancias"
                />

                {busqueda && (
                    <button
                        type="button"
                        onClick={() => setBusqueda("")}
                        aria-label="Limpiar búsqueda"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="categorias">

                <button
                    className={`categoria ${categoria === "todo" ? "activa" : ""}`}
                    onClick={() => obtenerCategoria("todo")}
                >
                    Todos
                </button>

                {categorias.map((cat) => (
                    <button
                        key={cat}
                        className={`categoria ${categoria === cat ? "activa" : ""}`}
                        onClick={() => obtenerCategoria(cat)}
                    >
                        {cat}
                    </button>
                ))}

            </div>

            <div className="categorias filtros-genero">
                <button
                    className={`categoria ${genero === "todos" ? "activa" : ""}`}
                    onClick={() => obtenerGenero("todos")}
                >
                    Todos los géneros
                </button>

                {(["HOMBRE", "MUJER", "UNISEX"] as const).map((opcion) => (
                    <button
                        key={opcion}
                        className={`categoria ${genero === opcion ? "activa" : ""}`}
                        onClick={() => obtenerGenero(opcion)}
                    >
                        {opcion}
                    </button>
                ))}
            </div>
            
            {error && (
                <p className="error">{error}</p>
            )}

            {mensajeCarrito && (
                mensajeCarrito.tipo === "exito" ? (
                    <button
                        type="button"
                        className="mensaje-carrito exito"
                        onClick={() => navigate("/carrito")}
                        role="status"
                        aria-live="polite"
                    >
                        {mensajeCarrito.texto} Ver carrito
                    </button>
                ) : (
                    <div className="mensaje-carrito error" role="status" aria-live="polite">
                        {mensajeCarrito.texto}
                    </div>
                )
            )}

            <div className="productos">
                {!cargando && !error && items.length === 0 && (
                    <p>{busqueda.trim()
                        ? `No se encontraron fragancias que comiencen por "${busqueda.trim()}".`
                        : "No hay productos para mostrar."}</p>
                )}
                {cargando && <p>Cargando productos...</p>}

                {items.map((item) => (
                
                    <article className="producto" key={item.id}>
                    
                        <div
                            className="producto-imagen"
                        >
                            <img
                                className="producto-foto"
                                src={obtenerUrlImagen(item.img)}
                                alt={item.nombre}
                                loading="lazy"
                                onError={marcarImagenNoDisponible}
                            />
                        
                            <span className="etiqueta">
                                Destacado
                            </span>
                        
                            <span className="segmento">
                                {item.segmentacion}
                            </span>
                        
                        </div>
                        
                        <div className="producto-info">

                            <Link className="product-detail-link" to={`/producto/${item.id}`}>
                                Ver detalles y opiniones
                            </Link>
                        
                            <p className="tipo">
                                {item.genero} · 30 ML
                            </p>
                        
                            <h2>
                                {item.nombre}
                            </h2>
                        
                            <p className="descripcion">
                                {item.descripcion}
                            </p>
                        
                            <div className="producto-presentaciones">
                                {(item.presentaciones || []).filter((presentacion) => presentacion.activo).map((presentacion) => (
                                    <button
                                        type="button"
                                        key={presentacion.id}
                                        className={presentacionSeleccionada[item.id] === presentacion.id ? "presentacion-activa" : ""}
                                        onClick={() => setPresentacionSeleccionada((actual) => ({ ...actual, [item.id]: presentacion.id }))}
                                    >
                                        {presentacion.mililitros ? `${presentacion.mililitros} ml` : "Estándar"}
                                    </button>
                                ))}
                            </div>

                            <div className="producto-footer">
                        
                                <div className="precio">
                                    {(() => {
                                        const presentacion = (item.presentaciones || []).find((itemPresentacion) => itemPresentacion.id === presentacionSeleccionada[item.id]) || (item.presentaciones || []).find((itemPresentacion) => itemPresentacion.activo);
                                        const precio = presentacion?.precio ?? item.precio;
                                        const precioFinal = presentacion?.precioFinal ?? presentacion?.precio ?? item.precioFinal ?? item.precio;
                                        const tienePromocion = presentacion?.tienePromocion ?? item.tienePromocion;
                                        return tienePromocion ? (
                                        <>
                                            <span className="precio-original">
                                                ${Number(precio).toLocaleString("es-CO")}
                                            </span>
                                            <span className="precio-promocional">
                                                ${Number(precioFinal).toLocaleString("es-CO")}
                                            </span>
                                            <small>{Math.round(presentacion?.porcentajeDescuento ?? item.porcentajeDescuento ?? 0)}% OFF</small>
                                        </>
                                        ) : `$${Number(precioFinal).toLocaleString("es-CO")}`;
                                    })()}
                                </div>
                        
                                {(() => {
                                    const presentacion = (item.presentaciones || []).find((itemPresentacion) => itemPresentacion.id === presentacionSeleccionada[item.id]) || (item.presentaciones || []).find((itemPresentacion) => itemPresentacion.activo);
                                    return (presentacion?.stock === 0 || (!presentacion && item.stock === 0)) ? (
                                    <span className="agotado">Agotado</span>
                                ) : (
                                    <button
                                        className="detalles"
                                        type="button"
                                        onClick={() => agregarAlCarrito(item.id, presentacion?.id)}>
                                        Agregar
                                    </button>
                                );
                                })()}
                                
                                

                            </div>

                        </div>
                        
                    </article>

                ))}

            </div>

            <button
                className="cargar-mas"
                type="button"
                onClick={cargarMas}
                disabled={!hayMas || cargando || cargandoMas}
            >
                {cargandoMas ? "Cargando..." : hayMas ? "Cargar más" : "No hay más productos"}
            </button>
            
        </div>
    )
}

export default Catalogo