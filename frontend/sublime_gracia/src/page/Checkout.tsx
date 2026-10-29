import { useEffect, useState } from "react";

import axios from "axios";

import "../style/checkout.css";
import { marcarImagenNoDisponible, obtenerUrlImagen } from "../utils/imageUrl";
import { guardarCartId, guardarValorLocal, headersCarrito } from "../utils/cartId";


interface Producto {

    id: number;

    nombre: string;

    descripcion: string;

    precio: number;

    img: string;
    presentaciones?: Presentacion[];
}

interface Presentacion {
    id: number;
    mililitros: number | null;
    precio: number;
}


interface CartItem {

    id: number;

    quantity: number;

    cartId: string | null;

    productId: number;

    producto: Producto;
    calculo?: {
        totalFinal: number;
        precioFinal: number;
        tienePromocion: boolean;
    } | null;
    presentacion?: Presentacion | null;

}


interface Cart {

    cartId: string | null;

    items: CartItem[];

}


const Checkout = () => {

    const [cart, setCart] = useState<Cart | null>(null);

    const [loading, setLoading] = useState(true);

    const [nombre, setNombre] = useState("");

    const [telefono, setTelefono] = useState("");

    const [email, setEmail] = useState("");

    const [direccion, setDireccion] = useState("");

    const [ciudad, setCiudad] = useState("");

    const [comprobante, setComprobante] =
        useState<File | null>(null);

    const [enviando, setEnviando] = useState(false);

    const [error, setError] =
        useState<string | null>(null);


    const API_URL = `${import.meta.env.VITE_API_URL}/api`;


    // ==========================================
    // OBTENER CARRITO
    // ==========================================

    useEffect(() => {

        const obtenerCarrito = async () => {

            try {

                const response = await axios.get(
                    `${API_URL}/cart`,
                    {
                        withCredentials: true,
                        headers: headersCarrito()
                    }
                );

                console.log(
                    "RESPUESTA REAL DEL CARRITO:",
                    response.data
                );

                guardarCartId(response.data.cartId);
                setCart(response.data);

            } catch (error) {

                console.error(
                    "Error al obtener carrito:",
                    error
                );

                setError(
                    "No se pudo cargar el carrito"
                );

            } finally {

                setLoading(false);

            }

        };

        obtenerCarrito();

    }, []);


    // ==========================================
    // CALCULAR TOTAL
    // ==========================================

    const calcularTotal = () => {

        if (!cart?.items) {
            return 0;
        }

        return cart.items.reduce(
            (total, item) => {

                if (!item.producto) {
                    return total;
                }

                return total + Number(item.calculo?.totalFinal ?? Number(item.producto.precio) * Number(item.quantity));

            },
            0
        );

    };


    const total = calcularTotal();

    const copiarNumeroNequi = async () => {
        const numero = "300XXXXXXXX";

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(numero);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = numero;
                textarea.setAttribute("readonly", "true");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                const copiado = document.execCommand("copy");
                textarea.remove();
                if (!copiado) {
                    throw new Error("No se pudo copiar el número");
                }
            }

            alert("Número de Nequi copiado");
        } catch {
            alert("No se pudo copiar el número. Puedes copiarlo manualmente: 300 XXX XXXX");
        }
    };


    // ==========================================
    // COMPROBANTE
    // ==========================================

    const manejarComprobante = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {

        const archivo =
            event.target.files?.[0];

        if (!archivo) {
            return;
        }


        if (!archivo.type.startsWith("image/")) {

            alert(
                "El comprobante debe ser una imagen"
            );

            event.target.value = "";

            setComprobante(null);

            return;
        }


        // Máximo 5 MB

        if (archivo.size > 5 * 1024 * 1024) {

            alert(
                "El comprobante no puede superar los 5 MB"
            );

            event.target.value = "";

            setComprobante(null);

            return;
        }


        setComprobante(archivo);

    };


    // ==========================================
    // CONFIRMAR PEDIDO
    // ==========================================

    const confirmarPedido = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {

        event.preventDefault();

        setError(null);


        // --------------------------------------
        // VALIDAR DATOS
        // --------------------------------------

        if (
            !nombre.trim() ||
            !email.trim() ||
            !telefono.trim() ||
            !direccion.trim() ||
            !ciudad.trim()
        ) {

            alert(
                "Completa todos los datos del cliente"
            );

            return;
        }


        if (!comprobante) {

            alert(
                "Debes subir el comprobante de pago"
            );

            return;
        }


        if (
            !cart ||
            !cart.items ||
            cart.items.length === 0
        ) {

            alert(
                "El carrito está vacío"
            );

            return;
        }


        try {

            setEnviando(true);


            // --------------------------------------
            // CREAR FORMDATA
            // --------------------------------------

            const formData = new FormData();


            formData.append(
                "nombre",
                nombre.trim()
            );

            formData.append(
                "email",
                email.trim()
            );

            formData.append(
                "telefono",
                telefono.trim()
            );

            formData.append(
                "direccion",
                direccion.trim()
            );

            formData.append(
                "ciudad",
                ciudad.trim()
            );

            formData.append("privacyAcknowledged", "true");
            formData.append("shippingDisclosureAcknowledged", "true");


            // --------------------------------------
            // CARRITO
            // --------------------------------------

            formData.append(
                "cartId",
                cart.cartId || ""
            );


            // --------------------------------------
            // TOTAL
            // --------------------------------------

            formData.append(
                "total",
                total.toString()
            );


            // --------------------------------------
            // COMPROBANTE
            // --------------------------------------

            formData.append(
                "comprobante",
                comprobante
            );


            console.log(
                "ENVIANDO PEDIDO..."
            );


            // --------------------------------------
            // ENVIAR AL BACKEND
            // --------------------------------------

            const response = await axios.post(
                `${API_URL}/pedidos`,
                formData,
                {
                    withCredentials: true,
                    headers: headersCarrito()
                }
            );


            console.log(
                "PEDIDO CREADO:",
                response.data
            );

            guardarValorLocal("ultimoPedidoId", String(response.data.pedido.id));


            // --------------------------------------
            // LIMPIAR CARRITO VISUAL
            // --------------------------------------

            setCart({
                cartId: cart.cartId,
                items: []
            });


            // --------------------------------------
            // LIMPIAR FORMULARIO
            // --------------------------------------

            setNombre("");

            setTelefono("");

            setEmail("");

            setDireccion("");

            setCiudad("");

            setComprobante(null);


            // --------------------------------------
            // CONFIRMACIÓN
            // --------------------------------------

            window.location.href = `/gracias/${response.data.pedido.id}`;


        } catch (error: any) {

            console.error(
                "ERROR AL CREAR PEDIDO:",
                error
            );


            const mensaje =
                error.response?.data?.message ||
                error.response?.data ||
                "No se pudo realizar el pedido";


            setError(
                typeof mensaje === "string"
                    ? mensaje
                    : "No se pudo realizar el pedido"
            );


        } finally {

            setEnviando(false);

        }

    };


    // ==========================================
    // CARGANDO
    // ==========================================

    if (loading) {

        return (

            <div className="checkout">

                <p>
                    Cargando carrito...
                </p>

            </div>

        );

    }


    // ==========================================
    // CARRITO VACÍO
    // ==========================================

    if (
        !cart ||
        !cart.items ||
        cart.items.length === 0
    ) {

        return (

            <div className="checkout">

                <div className="checkout-container">

                    <div className="checkout-form">

                        <h2>
                            Tu carrito está vacío
                        </h2>

                    </div>

                </div>

            </div>

        );

    }


    // ==========================================
    // RENDER
    // ==========================================

    return (

        <div className="checkout">

            <div className="checkout-container">


                {/* =================================
                    FORMULARIO
                ================================== */}

                <div className="checkout-form">

                    <h1>
                        Finalizar compra
                    </h1>

                    <h2>
                        Datos de entrega
                    </h2>


                    {error && (

                        <p className="error">
                            {error}
                        </p>

                    )}


                    <form
                        onSubmit={confirmarPedido}
                    >


                        {/* NOMBRE */}

                        <div className="form-group">

                            <label>
                                Nombre completo
                            </label>

                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) =>
                                    setNombre(
                                        e.target.value
                                    )
                                }
                                placeholder="Tu nombre completo"
                                required
                                disabled={enviando}
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="form-group">

                            <label>
                                Correo electrónico
                            </label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="tucorreo@gmail.com"
                                required
                                disabled={enviando}
                            />

                        </div>


                        {/* TELEFONO */}

                        <div className="form-group">

                            <label>
                                Teléfono
                            </label>

                            <input
                                type="tel"
                                value={telefono}
                                onChange={(e) =>
                                    setTelefono(
                                        e.target.value
                                    )
                                }
                                placeholder="300 000 0000"
                                required
                                disabled={enviando}
                            />

                        </div>


                        {/* DIRECCION */}

                        <div className="form-group">

                            <label>
                                Dirección
                            </label>

                            <input
                                type="text"
                                value={direccion}
                                onChange={(e) =>
                                    setDireccion(
                                        e.target.value
                                    )
                                }
                                placeholder="Dirección de entrega"
                                required
                                disabled={enviando}
                            />

                        </div>


                        {/* CIUDAD */}

                        <div className="form-group">

                            <label>
                                Ciudad
                            </label>

                            <input
                                type="text"
                                value={ciudad}
                                onChange={(e) =>
                                    setCiudad(
                                        e.target.value
                                    )
                                }
                                placeholder="Ciudad"
                                required
                                disabled={enviando}
                            />

                        </div>


                        {/* =================================
                            PAGO
                        ================================== */}

                        <div className="payment">

                            <h2>
                                Pago por Nequi
                            </h2>

                            <p>
                                Realiza la transferencia
                                por el valor de los productos mostrado abajo. El envío puede tener un costo separado según el destino.
                            </p>

                            <strong className="total-payment">

                                $
                                {total.toLocaleString(
                                    "es-CO"
                                )}

                            </strong>


                            <div className="nequi-info">

                                <p>
                                    Número de Nequi
                                </p>

                                <strong>
                                    301 708 9860
                                </strong>

                                <button
                                    type="button"
                                    onClick={copiarNumeroNequi}
                                >
                                    Copiar número
                                </button>

                            </div>

                            <p className="shipping-cost-notice">
                                El costo del envío no está incluido en este subtotal. Si aplica, te informaremos el costo y el total actualizado. No realices pagos adicionales hasta conocer el total y aceptarlo.
                            </p>

                            <label className="policy-acknowledgment shipping-acknowledgment">
                                <input type="checkbox" name="shippingDisclosureAcknowledged" value="true" required disabled={enviando} />
                                <span>Entiendo que el envío puede tener un costo separado y que conoceré el total actualizado antes de aceptar cualquier pago adicional.</span>
                            </label>


                            {/* QR */}

                            <div className="qr-container">

                                <p>
                                    Escanea el código QR
                                    para realizar el pago
                                </p>

                                <img
                                    src="/img/qr.jpeg"
                                    alt="QR de pago Nequi"
                                />

                            </div>

                        </div>

                        <label className="policy-acknowledgment">
                            <input type="checkbox" name="privacyAcknowledged" value="true" required disabled={enviando} />
                            <span>He leído la <a href="/privacidad" target="_blank" rel="noreferrer">política de privacidad</a> y entiendo que mis datos se usarán para gestionar este pedido.</span>
                        </label>

                        {/* =================================
                            COMPROBANTE
                        ================================== */}

                        <div className="form-group">

                            <label>
                                Comprobante de pago
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={
                                    manejarComprobante
                                }
                                required
                                disabled={enviando}
                            />


                            {comprobante && (

                                <p>
                                    Archivo seleccionado:{" "}
                                    {comprobante.name}
                                </p>

                            )}

                        </div>


                        {/* =================================
                            CONFIRMAR
                        ================================== */}

                        <button
                            className="confirm-button"
                            type="submit"
                            disabled={enviando}
                        >

                            {enviando
                                ? "Enviando pedido..."
                                : "Confirmar pedido"
                            }

                        </button>


                    </form>

                </div>


                {/* =================================
                    RESUMEN
                ================================== */}

                <div className="order-summary">

                    <h2>
                        Resumen del pedido
                    </h2>


                    {cart.items.map((item) => {

                        if (!item.producto) {
                            return null;
                        }


                        return (

                            <div
                                className="checkout-product"
                                key={item.id}
                            >

                                <img
                                    src={
                                        obtenerUrlImagen(item.producto.img)
                                    }
                                    alt={
                                        item.producto.nombre
                                    }
                                    onError={marcarImagenNoDisponible}
                                />


                                <div>

                                    <h3>
                                        {
                                            item.producto.nombre
                                        }
                                    </h3>

                                    <p>
                                        Presentación: {item.presentacion?.mililitros ? `${item.presentacion.mililitros} ml` : "Estándar"}
                                    </p>

                                    <p>
                                        Cantidad:{" "}
                                        {item.quantity}
                                    </p>

                                    <strong>

                                        $

                                        {Number(item.calculo?.totalFinal ?? Number(item.producto.precio) * Number(item.quantity)).toLocaleString(
                                            "es-CO"
                                        )}

                                    </strong>

                                </div>

                            </div>

                        );

                    })}


                    {/* TOTAL */}

                    <div className="checkout-total">

                        <span>
                            Total
                        </span>

                        <strong>

                            $

                            {total.toLocaleString(
                                "es-CO"
                            )}

                        </strong>

                    </div>

                </div>


            </div>

        </div>

    );

};


export default Checkout;
