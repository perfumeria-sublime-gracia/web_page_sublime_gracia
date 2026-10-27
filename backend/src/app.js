import express from 'express'
import cors from 'cors'
import routes from '../routes/index.js'
import errorHandler from '../middlewares/errorHandler.js'
import cookieParser from 'cookie-parser'
import { securityHeaders, rateLimit } from "../middlewares/security.middleware.js";
import { uploadsRoot } from "../utils/uploadStorage.js";

const app = express()
const originsPermitidos = ['https://sublime-gracia.netlify.app', "http://localhost:5173", "https://sublime-gracia.netlify.app/"]

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use(cors({
    origin: originsPermitidos,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Cart-Id"]
}))

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/uploads", express.static(uploadsRoot));

app.use(cookieParser())


app.use('/', routes)

app.use(errorHandler)

export default app