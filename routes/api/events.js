import express from "express"
const routes = express()

export let clients = []
setInterval(() => updateClients("ping"), 5*60*1000)

routes.get("/events", async (req, res) => {
    try {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-chache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        })
        res.write(`id: ${Number(new Date())}\ndata: ping\n\n`)
        res.id = Date.now()
        req.on('close', () => {
            clients = clients.filter(client => client.id != res.id)
        })
        clients.push(res)
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

export function updateClients(data) {
    clients.forEach(async res => {
        try {
            let timeout = setTimeout(() => {throw Error("Execution too slow")}, 500)
            res.write(`id: ${Number(new Date())}\ndata: ${data}\n\n`)
            clearTimeout(timeout)
        } catch(e) {
            console.error(e)
            clients = clients.filter(client => client.id != res.id)
            res.status(500).send(e.stack || e)
        }
    })
}

export default routes