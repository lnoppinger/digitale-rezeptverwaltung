import {db} from "./globals.js"

export default main

let berechnenKeys = [
    "preis",
    "nwa_energie_kj",
    "nwa_energie_kcal",
    "nwa_fett",
    "nwa_ges_fettsaeuren",
    "nwa_kohlenhydrate",
    "nwa_zucker",
    "nwa_eiweiss",
    "nwa_salz"
]

async function main(rezeptId, menge=1, rezeptIds=[]) {

    let rezept = await getRezeptDaten(rezeptId, menge)

    if(rezeptIds.includes(rezeptId)) throw Error(`Schleife in den Rezepten bei '${rezept.name}' gefunden.`)

    let dbZutaten = await db.selectJSON(
        "rezept_map",
        [
            "zutat_id as id",
            "menge as menge"
        ],
        `WHERE rezept_map.rezept_id = ${rezeptId}`
    )
    if(dbZutaten == null || dbZutaten.length < 1 ) {
        rezept.lieferanten = await getLieferanten(rezept)
        berechnenKeys.forEach(key => {
            let gesamt = 0
            rezept.lieferanten = rezept.lieferanten.map(lieferant => {
                lieferant[`gesamt_${key}`] = lieferant[key] * lieferant.faktor || 0
                gesamt += lieferant[`gesamt_${key}`]
                return lieferant
            })
            rezept[`gesamt_${key}`] = gesamt
        })
    } else {
        rezept.zutaten = await Promise.all( dbZutaten.map( zutat => {
            zutat.menge = zutat.menge / process.env.MENGE_FAKTOR
            return main(zutat.id, zutat.menge * rezept.faktor, [...rezeptIds, rezept.id])
        }))

        berechnenKeys.forEach(key => {
            let gesamt = 0
            rezept.zutaten.forEach(zutat => {
                gesamt += zutat[`gesamt_${key}`]
            })
            rezept[`gesamt_${key}`] = gesamt
        })
    }

    return rezept
}

async function getRezeptDaten(rezeptId, menge) {
    let dbRezept = await db.selectJSON(
        "rezept",
        [
            "rezept.id as id",
            "rezept.menge as menge",
            "rezept.name as name",
            "einheit.name as einheit",
            "einheit.multiplikator as einheit_faktor"
        ],
        `JOIN einheit
            ON einheit.id = rezept.einheit_id
        WHERE rezept.id=${rezeptId}`
    )

    if(dbRezept == null || dbRezept.length < 1) throw Error(`Kein Rezept mit id '${rezeptId}' gefunden.`)
    let rezept = dbRezept[0]

    rezept.rezept_menge = rezept.menge / process.env.MENGE_FAKTOR
    rezept.faktor = menge / rezept.rezept_menge
    rezept.menge = menge
    rezept.menge_vgl = rezept.menge * rezept.einheit_faktor

    return rezept
}

async function getLieferanten(rezept) {
    let lieferanten = await db.selectJSON(
        "zutat",
        [
            "id",
            "name",
            "anteil",
            "preis",
            "datum",
            "nwa_energie as nwa_energie_kj",
            "nwa_fett",
            "nwa_ges_fettsaeuren",
            "nwa_kohlenhydrate",
            "nwa_zucker",
            "nwa_eiweiss",
            "nwa_salz"
        ],
        `WHERE rezept_id=${rezept.id}`)

    let gesamtAnteil = 0
    lieferanten.forEach(lieferant => {
        gesamtAnteil += lieferant.anteil
    })

    lieferanten = lieferanten.map(lieferant => {
        let anteil = lieferant.anteil / gesamtAnteil
        lieferant.faktor = anteil * rezept.faktor
        lieferant.preis /= process.env.PREIS_FAKTOR
        lieferant.nwa_energie_kcal = lieferant.nwa_energie_kj * 0,2388
        return lieferant
    })

    return lieferanten
}