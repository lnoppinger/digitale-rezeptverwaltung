const routes = require("express")()

const db = require("../../../modules/db")

routes.get("/", async (req, res) => {
    try {
        // alle Zutaten auflisten
        let zutaten = req.zutaten

        zutaten_ = await Promise.all( zutaten.map( z => {
            return db.selectJSON(
                "rezept",
                [
                    "rezept.name as name",
                    "einheit.name as einheit",
                    `'${z.menge}' as menge`
                ],
                `JOIN rezept_art
                    ON rezept.rezept_art_id = rezept_art.id
                JOIN einheit
                    ON rezept.einheit_id = einheit.id
                WHERE rezept_art.name = 'Zutat'
                AND rezept.id = ${z.id}`
            )
        }))

        let zutatenDetails = zutaten_.map(z => {
            return z[0]
        })

        let text = ""

        zutatenDetails.forEach(z => {
            menge = z.menge.split(".")
            text += `${z.menge[0].padStart(7, " ")}${menge[1] != null ? "," : " "}${menge[1]?.padEnd(4, " ") || "    "}  ${z.einheit.padEnd(5, " ")} ${z.name}\n`
        })


        res.send(text)
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})



module.exports = routes