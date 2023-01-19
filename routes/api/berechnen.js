const routes = require("express")()

require("dotenv").config()

const berechnen = require("../../modules/berechnen")

routes.get("/:id/alle", async (req, res) => {
    try {
        res.json( await berechnen(req.params.id) )
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/:id/rezept", async (req, res) => {
    try {
        let daten = await berechnen(req.params.id)

        let textGanz = textErstellen(
            daten,
            (rezept, text) => `\n${text}${slice(rezept.menge, 7)}${slice(rezept.einheit, 3)} ${slice(rezept.faktor, 7)}x ${rezept.name} (${rezept.rezept_menge}${rezept.einheit})`,
            (zutat, text) => `${text}${slice(zutat.menge, 7)}${slice(zutat.einheit, 3)} ${zutat.name}`,
            (lieferant, text) => null,
            10
        )

        res.send(textGanz)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/:id/zutaten", async (req, res) => {
    try {
        let daten = await berechnen(req.params.id)

        let textGanz = textErstellen(
            daten,
            (rezept, text) => null,
            (rezept, text) => `${rezept.id}/////${rezept.name}/////${rezept.menge_vgl}/////${rezept.menge}/////${rezept.einheit}`,
            (lieferant, text) => null,
            0
        )

        let zutaten = textGanz.split("\n").slice(0, -1)
        let zutaten_ = []
        zutaten.forEach(zutat => {
            let z = zutat.split("/////")
            zutatFormated = {
                id: z[0],
                name: z[1],
                menge_vgl: Number(z[2]),
                menge: Number(z[3]),
                einheit: z[4]
            }
            let index = zutaten_.findIndex(z => z.id == zutatFormated.id)
            if(index > -1) {
                zutaten_[index].menge += zutatFormated.menge,
                zutaten_[index].menge_vgl += zutatFormated.menge_vgl
            } else {
                zutaten_.push(zutatFormated)
            }
        })

        zutaten_.sort( (a, b) => a.menge_vgl < b.menge_vgl)

        textGanz = ""
        textEnde = "\n\n"
        zutaten_.forEach(zutat => {
            textGanz += slice(zutat.menge, 7) + slice(zutat.einheit, 3) + "  " +  zutat.name + "\n"
            textEnde += zutat.name + ", "
        })
        textGanz += textEnde.slice(0, -2) + "\n"

        res.send(textGanz)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/:id/preis", async (req, res) => {
    try {
        let daten = await berechnen(req.params.id)

        let textGanz = textErstellen(
            daten,
            (rezept, text) => `\n${text}${slice(rezept.menge, 7)}${slice(rezept.einheit, 3)} ${slice(rezept.faktor, 7)}x ${rezept.name} (${rezept.rezept_menge}${rezept.einheit})`,
            (zutat, text) => `\n${text}${slice(zutat.menge, 7)}${slice(zutat.einheit, 3)} ${zutat.name}`,
            (lieferant, text) => `${slice(`${text}${String(Math.round(lieferant.anteil)).padStart(3, " ")}% ${lieferant.name}`, 80)}${slice(lieferant.gesamt_preis, 7)}€`,
            10
        )
        textGanz += `${"".padEnd(80, " ")}--------
${"".padEnd(80, " ")}${slice(daten.gesamt_preis, 7)}€`

        res.send(textGanz)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/:id/naehrwerte", async (req, res) => {
    try {
        let daten = await berechnen(req.params.id)

        let textGanz = "".padEnd(80, " ") + "Energie".padStart(25, " ") + "Fett ".padStart(10, " ") + "davon ges. Fettsäuren".padStart(25, " ") + 
            "Kohlenhydrate".padStart(15, " ") + "davon Zucker".padStart(15, " ") + "Eiweiß".padStart(10, " ") + "Salz".padStart(10, " ")
        textGanz += textErstellen(
            daten,
            (rezept, text) => `\n${text}${slice(rezept.menge, 7)}${slice(rezept.einheit, 3)} ${slice(rezept.faktor, 7)}x ${rezept.name} (${rezept.rezept_menge}${rezept.einheit})`,
            (zutat, text) => `\n${text}${slice(zutat.menge, 7)}${slice(zutat.einheit, 3)} ${zutat.name}`,
            (lieferant, text) => `${slice(`${text}${String(Math.round(lieferant.anteil)).padStart(3, " ")}% ${lieferant.name}`, 80)}${slice(lieferant.gesamt_nwa_energie_kj, 10)}kJ ${slice(lieferant.gesamt_nwa_energie_kcal, 8)}kcal ${slice(lieferant.gesamt_nwa_fett, 8)}g ${slice(lieferant.gesamt_nwa_ges_fettsaeuren, 23)}g ${slice(lieferant.gesamt_nwa_kohlenhydrate, 13)}g ${slice(lieferant.gesamt_nwa_zucker, 13)}g ${slice(lieferant.gesamt_nwa_eiweiss, 8)}g ${slice(lieferant.gesamt_nwa_salz, 8)}g`,
            10
        )
        textGanz += `${"".padEnd(80, " ").padEnd(190, "-")}
${"".padEnd(80, " ")}${slice(daten.gesamt_nwa_energie_kj, 10)}kJ ${slice(daten.gesamt_nwa_energie_kcal, 8)}kcal ${slice(daten.gesamt_nwa_fett, 8)}g ${slice(daten.gesamt_nwa_ges_fettsaeuren, 23)}g ${slice(daten.gesamt_nwa_kohlenhydrate, 13)}g ${slice(daten.gesamt_nwa_zucker, 13)}g ${slice(daten.gesamt_nwa_eiweiss, 8)}g ${slice(daten.gesamt_nwa_salz, 8)}g

Energie:   ${slice(daten.gesamt_nwa_energie_kj, 10)}kJ ${slice(daten.gesamt_nwa_energie_kcal, 8)}kcal
Fett:                      ${slice(daten.gesamt_nwa_fett, 8)}g
    davon ges. Fettsäuren: ${slice(daten.gesamt_nwa_ges_fettsaeuren, 8)}g
Kohlenhydrate:             ${slice(daten.gesamt_nwa_kohlenhydrate, 8)}g
    davon Zucker:          ${slice(daten.gesamt_nwa_zucker, 8)}g
Eiweiß:                    ${slice(daten.gesamt_nwa_eiweiss, 8)}g
Salz:                      ${slice(daten.gesamt_nwa_salz, 8)}g`
        res.send(textGanz)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})




function textErstellen(daten, rezeptCallback, zutatCallback, lieferantCallback, einruecken=5, ebene=0) {
    let text = "".padEnd(einruecken * ebene, " ")

    if(daten.zutaten == null && daten.lieferanten == null) {
        text = lieferantCallback(daten, text) || ""
        if(text != "") text += "\n"
        

    } else if(daten.zutaten == null) {
        text = zutatCallback(daten, text) || ""
        if(text != "") text += "\n"
        daten.lieferanten.forEach(zutat => {
            text += textErstellen(zutat, rezeptCallback, zutatCallback, lieferantCallback, einruecken, ebene + 1)
        })

    } else {
        text = rezeptCallback(daten, text) || ""
        if(text != "") text += "\n"
        daten.zutaten.forEach(zutat => {
            text += textErstellen(zutat, rezeptCallback, zutatCallback, lieferantCallback, einruecken, ebene + 1)
        })
    }

    return text
}

function slice(text, length) {
    if(typeof text == "number") {
        let digitsBefore = String(Math.floor(text))
        let digitsAfter = String(text).slice(digitsBefore.length + 1, digitsBefore.length + 4).padEnd(3, "0")
        
        text = digitsBefore + "," + digitsAfter

        return String(text).padStart(length, " ")
    }

    return text.padEnd(length, " ").slice(0, length)
}

module.exports = routes