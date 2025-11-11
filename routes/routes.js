import express from "express"
import path from "path"
import { fileURLToPath } from "url"
const app = express()

// Routing
app.use("/", (await import("./render.js")).default)

app.use("/api",  (await import("./api/berechnen.js")).default)
app.use("/api",  (await import("./api/events.js")).default)
app.use("/api", (await import("./api/rezept.js")).default)

// static Files
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use("/", express.static(path.resolve(__dirname, "../public")))

// 404
app.use( (req, res) => {
    if(!res.headersSent) {
        res.sendStatus(404)
    }
})


export default app