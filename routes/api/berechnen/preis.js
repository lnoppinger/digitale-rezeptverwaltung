const routes = require("express")()

const db = require("../../../modules/db")

routes.get("/", async (req, res) => {
    try {
        let zutaten = req.zutaten
        
        let gesamtsumme = 0
        let zutatenDetails = []
        await Promise.all( zutaten.map( async z => {

            let qRes = await db.selectJSON(
                "rezept",
                [
                    "rezept.name as name",
                    "einheit.name as einheit"
                ],
                `JOIN rezept_art
                    ON rezept.rezept_art_id = rezept_art.id
                JOIN einheit
                    ON rezept.einheit_id = einheit.id
                WHERE rezept_art.name = 'Zutat'
                AND rezept.id = ${z.id}`
            )

            let qResVar = await db.selectJSON(
                "zutat",
                [
                    "name",
                    "preis",
                    "anteil"
                ],
                `WHERE rezept_id = ${z.id}`
            )

            let maxAnteil = 0
            qResVar.forEach(v => {
                maxAnteil += v.anteil
            })

            let gesamtpreis = 0
            let varianten = []
            qResVar.forEach(v => {
                let anteil = v.anteil / maxAnteil
                let preis = Math.round( z.menge * anteil * v.preis )
                varianten.push({
                    name: v.name,
                    anteil: Math.round(anteil * 100),
                    preis: preisInEur(preis),
                    preis_pro_einheit: preisInEur(v.preis)
                })
                gesamtpreis += preis
            })

            zutatenDetails.push({
                name: qRes[0].name,
                einheit: qRes[0].einheit,
                menge: z.menge,
                varianten: varianten,
                preis: preisInEur(gesamtpreis)
            })

            gesamtsumme += gesamtpreis
        }))

        console.log(zutatenDetails)

        let abstand = "".padEnd(60, " ")

        let text = ""
        zutatenDetails.forEach(z => {
            let menge = z.menge.toString().split(".")
            text += `${menge[0].padStart(5, " ")}${menge[1] != null ? "," : " "}${menge[1]?.padEnd(4, " ") || "    "}  ${z.einheit.padEnd(5, " ")} ${z.name}\n`
            
            z.varianten.forEach(v => {
                let abstand2 = "".padEnd(12, " ")
                text += `${abstand2}${v.anteil.toString().padEnd(3, " ")} %  ${v.name.padEnd(30, " ")}  ${v.preis.padStart(8, " ")}\n`
            })

            text += `${abstand}${z.preis.padStart(8, " ")}\n`
        })

        text += `${abstand}--------\n`
        text += `${abstand}${preisInEur(gesamtsumme).padStart(8, " ")}\n`

        res.send(text)
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

function preisInEur(preis) {
    if(preis == null || isNaN(preis)) {
        return "NA"
    }
    preis = preis / 10

    let e = Math.floor(preis / 100)
    let ct = Math.round(preis - e*100)

    if(ct < 10) {
        return `${e},0${ct} €`
    }
    return `${e},${ct} €`
}

module.exports = routes