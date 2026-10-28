import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../style/login.css"

const Login = () => {

    const navigate = useNavigate()

    const [correo, setCorreo] = useState("")
    const [contraseña, setContraseña] = useState("")
    const [error, setError] = useState("")
    const [cargando, setCargando] = useState(false)

    const API_URL = import.meta.env.VITE_API_URL

    const iniciarSesion = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {

        e.preventDefault()

        setError("")

        if (!correo || !contraseña) {
            setError("Completa todos los campos")
            return
        }

        try {

            setCargando(true)

            const response = await axios.post(
                `${API_URL}/api/auth/login`,
                {
                    correo,
                    contraseña
                }
            )

            console.log("LOGIN:", response.data)

            const { token, user } = response.data

            if (!token) {
                setError("El servidor no devolvió el token")
                return
            }

            // Guardamos el token
            localStorage.setItem("token", token)

            // Guardamos los datos del usuario
            localStorage.setItem(
                "user",
                JSON.stringify(user)
            )

            // Verificamos si es administrador
            if (user.rol === "admin") {

                navigate("/admin")

            } else {

                navigate("/")
            }

        } catch (error: any) {

            console.error(
                "Error al iniciar sesión:",
                error
            )

            if (error.response?.status === 429) {
                setError(
                    error.response.data?.message ||
                    "Has alcanzado el límite de intentos fallidos. Intenta de nuevo más tarde."
                )
            } else {
                setError(
                    error.response?.data?.message ||
                    "Correo o contraseña incorrectos"
                )
            }

        } finally {

            setCargando(false)

        }
    }

    return (

        <div className="login">

            <div className="login-container">

                <h1>
                    Sublime Gracia
                </h1>

                <h2>
                    Iniciar sesión
                </h2>

                <form onSubmit={iniciarSesion}>

                    <div className="form-group">

                        <label>
                            Correo
                        </label>

                        <input
                            type="email"
                            value={correo}
                            onChange={(e) =>
                                setCorreo(e.target.value)
                            }
                            placeholder="admin@gmail.com"
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Contraseña
                        </label>

                        <input
                            type="password"
                            value={contraseña}
                            onChange={(e) =>
                                setContraseña(e.target.value)
                            }
                            placeholder="Tu contraseña"
                        />

                    </div>

                    {error && (

                        <p className="login-error">
                            {error}
                        </p>

                    )}

                    <button
                        type="submit"
                        disabled={cargando}
                    >
                        {cargando
                            ? "Iniciando sesión..."
                            : "Iniciar sesión"
                        }
                    </button>

                </form>

            </div>

        </div>
    )
}

export default Login
