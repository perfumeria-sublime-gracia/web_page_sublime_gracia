import { useState, type FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import '../style/contacto.css'

const Contacto = () => {
    const [enviando, setEnviando] = useState(false)
    const [estadoEnvio, setEstadoEnvio] = useState('')


const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const contactTemplateId = import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID
    const autoReplyTemplateId = import.meta.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    const formData = new FormData(form)
    const nombre = String(formData.get('nombre') ?? '').trim()
    const correo = String(formData.get('correo') ?? '').trim()
    const mensaje = String(formData.get('mensaje') ?? '').trim()

    if (!serviceId || !contactTemplateId || !autoReplyTemplateId || !publicKey) {
        setEstadoEnvio('El formulario no está configurado correctamente.')
        return
    }

    if (!nombre || !correo || !mensaje) {
        setEstadoEnvio('Completa todos los campos antes de enviar.')
        return
    }

    setEnviando(true)
    setEstadoEnvio('')

    const parametros = {
        client_name: nombre,
        client_email: correo,
        message: mensaje,
    }

    try {
        // 1. Notificación para Sublime Gracia
        await emailjs.send(
            serviceId,
            contactTemplateId,
            parametros,
            { publicKey },
        )

        // 2. Confirmación para el cliente
        await emailjs.send(
            serviceId,
            autoReplyTemplateId,
            parametros,
            { publicKey },
        )

        setEstadoEnvio(
            '¡Mensaje enviado correctamente! Recibirás una confirmación en tu correo electrónico. Si no encuentras nuestro mensaje en tu bandeja de entrada, revisa la carpeta de spam o correo no deseado.'
        )
        form.reset()
    } catch (error) {
        console.error('Error al enviar los correos con EmailJS:', error)

        if (error instanceof emailjs.EmailJSResponseStatus) {
            console.error('Estado:', error.status, 'Detalle:', error.text)
        }

        setEstadoEnvio(
            'No se pudo completar el envío de los correos. Comprueba tu dirección de correo e inténtalo de nuevo.'
        )
    } finally {
        setEnviando(false)
    }
}


    return (
        <main className="contacto">

            <h1>Contacto</h1>

            <h2>¿Tienes dudas?</h2>

            <p>
                Puedes escribirnos a través de nuestras redes sociales. El tiempo de respuesta es de entre 1 y 48 horas, dependiendo de nuestra disponibilidad.
            </p>

            <div className="redes">

                <h2>Redes</h2>

                <a
                    href="https://www.facebook.com/profile.php?id=61580902880617"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>Facebook</span>
                    <img
                        src="/icons/icons8-facebook.gif"
                        alt="Facebook"
                    />
                </a>

                <a
                    href="https://www.instagram.com/sg_perfumeriasp?cplk=MWprOG94dGU4M2s0MA%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>Instagram</span>
                    <img
                        src="/icons/icons8-instagram.gif"
                        alt="Instagram"
                    />
                </a>

            </div>


            <form name="form" onSubmit={handleSubmit}>
                <h2>Escríbenos a nuestro correo</h2>
                <p>Déjanos saber tus dudas o comentarios</p>
                <br />
                <hr />
                <br />

                <label htmlFor="nombre">Nombre</label>
                <input type="text" name="nombre" id="nombre" placeholder="Nombre" autoComplete="name" required />

                <label htmlFor="correo">Correo</label>
                <input type="email" name="correo" id="correo" placeholder="Correo" autoComplete="email" required />

                <label htmlFor="mensaje">Mensaje</label>
                <textarea name="mensaje" id="mensaje" placeholder="Mensaje" required></textarea>

                <button type="submit" disabled={enviando}>
                    {enviando ? 'Enviando...' : 'Enviar'}
                </button>
                {estadoEnvio && <p role="status" aria-live="polite">{estadoEnvio}</p>}
            </form>


        </main>
    )
}

export default Contacto
