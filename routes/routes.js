import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import {config} from "../globals.js"
import eoidc from 'express-openid-connect';
const app = express()

// static Files
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use("/", express.static(path.resolve(__dirname, "../public")))
app.get("/ping", (req, res) => {
    res.sendStatus(200)
})

// Api
if(config.OIDC_ISSUER_URL != null) {
    app.use("/api", (req, res, next) => {
        if(!req.oidc.isAuthenticated()) {
            res.sendStatus(401)
            return
        }
        next()
    })
}
app.use("/api",  (await import("./api/berechnen.js")).default)
app.use("/api",  (await import("./api/events.js")).default)
app.use("/api", (await import("./api/rezept.js")).default)

// Rendering
if(config.OIDC_ISSUER_URL != null) {
    app.use(/^(?!\/$)/, eoidc.requiresAuth())
}
app.use("/", (await import("./render.js")).default)

// 404
app.use( (req, res) => {
    if(!res.headersSent) {
        res.sendStatus(404)
    }
})


export default app