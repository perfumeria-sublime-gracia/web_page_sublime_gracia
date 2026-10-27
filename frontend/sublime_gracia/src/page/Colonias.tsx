import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../style/admin.css";
import { marcarImagenNoDisponible, obtenerUrlImagen } from "../utils/imageUrl";

interface Producto {
    id: number;
    nombre: string;
    marca?: string;
    genero: string;
    categoria?: string;
    descripcion: string;
    precio: number;
    stock?: number | null;
    img: string;
    activo: boolean;
    presentaciones?: Presentacion[];
}

interface Presentacion {
    id?: number;
    mililitros: number | null;
    precio: number;
    stock: number | null;
    activo: boolean;
}

type Formulario = {
    nombre: string;
    marca: string;
    genero: "HOMBRE" | "MUJER" | "UNISEX";
    categoria: string;
    descripcion: string;
    precio: string;
    stock: string;
    activo: boolean;
};

const formularioInicial: Formulario = {
    nombre: "",
    marca: "",
    genero: "HOMBRE",
    categoria: "",
    descripcion: "",
    precio: "",
    stock: "0",
    activo: true
};

const presentacionInicial: Presentacion = { mililitros: 30, precio: 0, stock: 0, activo: true };

const Colonias = () => {
    const navigate = useNavigate();
    const API_URL = `${import.meta.env.VITE_API_URL}/api`;
    const [productos, setProductos] = useState<Producto[]>([]);
    const [formulario, setFormulario] = useState<Formulario>(formularioInicial);
    const [productoEditando, setProductoEditando] = useState<number | null>(null);
    const [imagen, setImagen] = useState<File | null>(null);
    const [preview, setPreview] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroGenero, setFiltroGenero] = useState("");
    const [filtroActivo, setFiltroActivo] = useState("");
    const [filtroStock, setFiltroStock] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [presentaciones, setPresentaciones] = useState<Presentacion[]>([{ ...presentacionInicial }]);

    const token = () => localStorage.getItem("token") || "";
    const config = () => ({ headers: { Authorization: `Bearer ${token()}` } });

    const manejarError = (reason: any) => {
        if ([401, 403].includes(reason.response?.status)) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
            return;
        }
        setError(reason.response?.data?.message || "No se pudo completar la operación");
    };

    const cargarProductos = async () => {
        try {
            const params = new URLSearchParams();
            if (busqueda.trim()) params.set("search", busqueda.trim());
            if (filtroGenero) params.set("genero", filtroGenero);
            if (filtroActivo) params.set("activo", filtroActivo);
            if (filtroStock) params.set("stock", filtroStock);
            const response = await axios.get(`${API_URL}/admin/productos?${params}`, config());
            setProductos(response.data);
        } catch (reason) {
            manejarError(reason);
        }
    };

    useEffect(() => {
        const userValue = localStorage.getItem("user");
        try {
            if (!token() || JSON.parse(userValue || "null")?.rol !== "admin") {
                navigate("/", { replace: true });
                return;
            }
        } catch {
            navigate("/", { replace: true });
            return;
        }
        cargarProductos();
    }, [busqueda, filtroGenero, filtroActivo, filtroStock]);

    const cambiarCampo = (campo: keyof Formulario, valor: string | boolean) => {
        setFormulario((actual) => ({ ...actual, [campo]: valor }));
    };

    const seleccionarImagen = (event: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = event.target.files?.[0];
        if (!archivo) return;
        if (!["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
            setImagen(null);
            setPreview("");
            setError("Selecciona una imagen PNG, JPG, JPEG, GIF, WEBP o AVIF");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            setImagen(null);
            setPreview("");
            setError("La imagen no puede superar los 5 MB");
            return;
        }
        setError("");
        setImagen(archivo);
        setPreview(URL.createObjectURL(archivo));
    };

    const guardar = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMensaje("");
        if (!formulario.nombre.trim()) return setError("El nombre es obligatorio");
        if (!formulario.marca.trim()) return setError("La marca es obligatoria");
        if (!formulario.descripcion.trim()) return setError("La descripción es obligatoria");
        if (!presentaciones.length) return setError("Agrega al menos una presentación");
        const mililitros = presentaciones.map((item) => item.mililitros);
        if (new Set(mililitros).size !== mililitros.length) return setError("No puede haber presentaciones duplicadas");
        if (presentaciones.some((item) => !item.mililitros || item.mililitros <= 0 || item.precio <= 0 || item.stock === null || item.stock < 0)) return setError("Revisa mililitros, precio y stock de las presentaciones");

        try {
            setGuardando(true);
            const datos = new FormData();
            Object.entries(formulario).forEach(([campo, valor]) => datos.append(campo, String(valor)));
            datos.append("segmentacion", formulario.categoria);
            datos.append("presentaciones", JSON.stringify(presentaciones));
            datos.set("precio", String(presentaciones[0].precio));
            datos.set("stock", String(presentaciones[0].stock));
            if (imagen) datos.append("imagen", imagen);
            const url = productoEditando ? `${API_URL}/productos/${productoEditando}` : `${API_URL}/productos`;
            const response = productoEditando
                ? await axios.put(url, datos, config())
                : await axios.post(url, datos, config());
            setProductos((actuales) => productoEditando
                ? actuales.map((producto) => producto.id === productoEditando ? response.data : producto)
                : [response.data, ...actuales]);
            setMensaje(productoEditando ? "Colonia actualizada correctamente." : "Colonia agregada correctamente.");
            cancelarEdicion();
        } catch (reason) {
            manejarError(reason);
        } finally {
            setGuardando(false);
        }
    };

    const editar = (producto: Producto) => {
        setProductoEditando(producto.id);
        setFormulario({
            nombre: producto.nombre,
            marca: producto.marca || "",
            genero: producto.genero.toUpperCase() as Formulario["genero"],
            categoria: producto.categoria || "Otros",
            descripcion: producto.descripcion,
            precio: String(producto.precio),
            stock: String(producto.stock ?? 0),
            activo: producto.activo
        });
        setPresentaciones(producto.presentaciones?.map((item) => ({ ...item })) || [{ ...presentacionInicial, precio: producto.precio }]);
        setPreview(obtenerUrlImagen(producto.img));
        setImagen(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelarEdicion = () => {
        setProductoEditando(null);
        setFormulario(formularioInicial);
        setImagen(null);
        setPreview("");
        setPresentaciones([{ ...presentacionInicial }]);
    };

    const cambiarPresentacion = (index: number, campo: keyof Presentacion, valor: string | boolean) => {
        setPresentaciones((actuales) => actuales.map((item, itemIndex) => itemIndex === index
            ? { ...item, [campo]: campo === "mililitros" || campo === "precio" || campo === "stock" ? (valor === "" ? null : Number(valor)) : valor }
            : item));
    };

    const agregarPresentacion = () => {
        const ultima = presentaciones[presentaciones.length - 1];
        setPresentaciones([...presentaciones, { ...presentacionInicial, mililitros: (ultima?.mililitros || 0) + 10 }]);
    };

    const cambiarEstado = async (producto: Producto) => {
        try {
            await axios.patch(`${API_URL}/productos/${producto.id}/estado`, { activo: !producto.activo }, config());
            setProductos((actuales) => actuales.map((item) => item.id === producto.id ? { ...item, activo: !item.activo } : item));
            setMensaje(producto.activo ? "Colonia desactivada correctamente." : "Colonia activada correctamente.");
        } catch (reason) {
            manejarError(reason);
        }
    };

    const eliminar = async (producto: Producto) => {
        if (!window.confirm(`¿Seguro que deseas eliminar ${producto.nombre}?`)) return;
        try {
            const response = await axios.delete(`${API_URL}/productos/${producto.id}`, config());
            setMensaje(response.data.message || "Colonia desactivada correctamente.");
            await cargarProductos();
        } catch (reason) {
            manejarError(reason);
        }
    };

    return (
        <main className="admin colonias-admin">
            <header className="admin-header">
                <div><h1>Colonias</h1><p>Administra productos, precios e inventario.</p></div>
                <Link className="admin-refresh" to="/admin">Volver al panel</Link>
            </header>
            {mensaje && <div className="admin-success">{mensaje}</div>}
            {error && <div className="admin-error">{error}</div>}

            <section className="admin-promociones">
                <div className="admin-title"><div><h2>{productoEditando ? "Editar colonia" : "Agregar colonia"}</h2><span>El precio guardado siempre es el precio original.</span></div></div>
                <form className="colonia-form" onSubmit={guardar}>
                    <input required placeholder="Nombre de la colonia" value={formulario.nombre} onChange={(e) => cambiarCampo("nombre", e.target.value)} />
                    <input required placeholder="Marca" value={formulario.marca} onChange={(e) => cambiarCampo("marca", e.target.value)} />
                    <select value={formulario.genero} onChange={(e) => cambiarCampo("genero", e.target.value)}><option value="HOMBRE">HOMBRE</option><option value="MUJER">MUJER</option><option value="UNISEX">UNISEX</option></select>
                    <select value={formulario.categoria} onChange={(e) => cambiarCampo("categoria", e.target.value)}>
                        <option>seleccionar</option>
                        <option>Amaderadas</option>
                        <option>Árabes</option>
                        <option>Cítricas</option>
                        <option>Aromáticas</option>
                        <option>Floral</option>
                        <option>Frutales</option>
                        <option>Dulces</option>
                        <option>Frescas</option>
                        <option>Especiadas</option>
                        <option>Otros</option>
                        </select>
                    <textarea required placeholder="Descripción" value={formulario.descripcion} onChange={(e) => cambiarCampo("descripcion", e.target.value)} />
                    <label className="colonia-imagen">Imagen<input type="file" accept=".avif,.gif,.jfif,.jpeg,.jpg,.png,.webp" onChange={seleccionarImagen} /></label>
                    {preview && <img className="colonia-preview" src={preview} alt="Vista previa" onError={marcarImagenNoDisponible} />}
                    <label className="colonia-estado"><input type="checkbox" checked={formulario.activo} onChange={(e) => cambiarCampo("activo", e.target.checked)} /> Disponible</label>
                    <div className="presentaciones-form">
                        <h3>Presentaciones</h3>
                        {presentaciones.map((presentacion, index) => <div className="presentacion-row" key={index}>
                            <label>Mililitros<input type="number" min="1" value={presentacion.mililitros ?? ""} onChange={(e) => cambiarPresentacion(index, "mililitros", e.target.value)} /></label>
                            <label>Precio<input type="number" min="1" value={presentacion.precio || ""} onChange={(e) => cambiarPresentacion(index, "precio", e.target.value)} /></label>
                            <label>Stock<input type="number" min="0" value={presentacion.stock ?? ""} onChange={(e) => cambiarPresentacion(index, "stock", e.target.value)} /></label>
                            <label>Activa<input type="checkbox" checked={presentacion.activo} onChange={(e) => cambiarPresentacion(index, "activo", e.target.checked)} /></label>
                            {presentaciones.length > 1 && <button type="button" onClick={() => setPresentaciones((actuales) => actuales.filter((_, itemIndex) => itemIndex !== index))}>Eliminar</button>}
                        </div>)}
                        <button type="button" onClick={agregarPresentacion}>+ Agregar presentación</button>
                    </div>
                    <div className="colonia-form-actions"><button className="admin-refresh" type="submit" disabled={guardando}>{guardando ? "Guardando..." : productoEditando ? "Actualizar colonia" : "Agregar colonia"}</button>{productoEditando && <button type="button" onClick={cancelarEdicion}>Cancelar</button>}</div>
                </form>
            </section>

            <section className="admin-promociones">
                <div className="admin-title"><div><h2>Listado de colonias</h2><span>{productos.length} resultados</span></div></div>
                <div className="colonia-filtros"><input placeholder="Buscar por nombre o marca" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><select value={filtroGenero} onChange={(e) => setFiltroGenero(e.target.value)}><option value="">Todos los géneros</option><option value="HOMBRE">HOMBRE</option><option value="MUJER">MUJER</option><option value="UNISEX">UNISEX</option></select><select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}><option value="">Todos los estados</option><option value="true">Activos</option><option value="false">Inactivos</option></select><select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)}><option value="">Todo el stock</option><option value="disponible">Disponible</option><option value="agotado">Agotado</option></select></div>
                <div className="colonias-lista">{productos.map((producto) => { const precios = (producto.presentaciones || []).map((item) => Number(item.precio)); return <article className="colonia-card" key={producto.id}><img src={obtenerUrlImagen(producto.img)} alt={producto.nombre} onError={marcarImagenNoDisponible} /><div><h3>{producto.nombre}</h3><p>{producto.marca || "Sin marca"} · {producto.genero}</p><p>{producto.presentaciones?.length || 0} presentaciones</p><p>Desde: ${Math.min(...(precios.length ? precios : [producto.precio])).toLocaleString("es-CO")} · Hasta: ${Math.max(...(precios.length ? precios : [producto.precio])).toLocaleString("es-CO")}</p><strong className={producto.activo ? "estado-activo" : "estado-inactivo"}>{producto.activo ? "ACTIVA" : "INACTIVA"}</strong></div><div className="colonia-actions"><button onClick={() => editar(producto)}>Editar</button><button onClick={() => cambiarEstado(producto)}>{producto.activo ? "Desactivar" : "Activar"}</button><button onClick={() => eliminar(producto)}>Eliminar</button></div></article>; })}</div>
            </section>
        </main>
    );
};

export default Colonias;
