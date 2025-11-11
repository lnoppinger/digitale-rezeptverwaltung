import express from "express"
import { db, rezeptEinheitTypes } from "../../modules/globals.js"
const routes = express() 

routes.get("/rezept/:id/berechnen/:art", async (req, res) => {
    try {
        let menge = (isNaN(req.query.menge) || req.query.menge < 1) ? 1 : req.query.menge
        let einheit = rezeptEinheitTypes.includes(req.query.einheit?.toUpperCase()) ? req.query.einehit?.toUpperCase() : "ST"

        let data = await db.query("SELECT id FROM rezepte WHERE id=$1 AND art='R'", req.params.id)
        if(data.length < 1) {
            res.sendStatus(404)
            return
        }
        let id = data[0].id

        let max = await preCheck(id)
        let text = []
        if(req.params.art.toLowerCase() == "rezepte") {
            await berechnen(
                id, menge, einheit,
                r => text.push(f("", r.layer*4) + f(r.menge, 6, 2) + f(r.einheit, 2) + "(" + f(r.faktor, 7, 3, false) + "x) " + f(r.name, 60)),
                w => text.push(f("", w.layer*4) + f(w.menge, 6, 2) + f(w.einheit, 2) + "(" + f(w.faktor, 7, 3, false) + "x) "+ f(w.name, 60)),
                z => text.push(f("", z.layer*4) + f(z.menge, 6, 2) + f(z.einheit, 2) + "(" + f(z.faktor, 7, 3, false) + "x) "+ f(z.name, 60))
            )

        } else if(req.params.art.toLowerCase() == "zutaten") {
            await berechnen(
                id, menge, einheit,
                r => {},
                w => {},
                z => {
                    let s = `${z.allergen ? "(A)" : "  "} ${z.name}`
                    if(!text.includes(s)) text.push(s)
                }
            )

        } else if(req.params.art.toLowerCase() == "preis") {
            let gesamtPreis = 0
            await berechnen(
                id, menge, einheit,
                r => text.push(f("", r.layer*4) + f(r.menge, 6, 2) + f(r.einheit, 2) + f(r.name, 60)),
                w => text.push(f("", w.layer*4) + f(w.menge, 6, 2) + f(w.einheit, 2) + f(w.name, 60)),
                z => text.push(f("", z.layer*4) + f(z.menge, 6, 2) + f(z.einheit, 2) + f(z.name, 60)),
                l => {
                    text.push(f("", max*4) + f(l.name, 20) + f(l.preis, 7, 3) + "(" + l.datum + ")")
                    gesamtPreis += l.preis
                }
            )
            text.push(f("", max*4+21) + f("--------", 7))
            text.push(f("", max*4+8) + "Gesamtpreis: " + f(gesamtPreis, 7, 3))

        } else if(req.params.art.toLowerCase() == "naehrwertangaben") {
            let kcal=0, kj=0, fett=0, gesfett =0, kohlen=0, zucker=0, eiweiss=0, salz=0
            await berechnen(
                id, menge, einheit,
                r => text.push(f("", r.layer*4) + f(r.menge, 6, 2) + f(r.einheit, 2) + f(r.name, 60)),
                w => text.push(f("", w.layer*4) + f(w.menge, 6, 2) + f(w.einheit, 2) + f(w.name, 60)),
                z => {
                    text.push(f("", z.layer*4) + f(z.menge, 6, 2) + f(z.einheit, 2) + f(z.name, 60))
                    text.push(f(z.nwa_kcal, 8, 1) + f(z.nwa_kj, 8, 1) + f(z.nwa_fett, 8, 1) + f(z.nwa_gesfett, 8, 1) + f(z.nwa_kohlen, 8, 1) +
                        f(z.nwa_zucker, 8, 1) + f(z.nwa_eiweiss, 8, 1) + f(z.nwa_salz, 8, 1))
                    kcal += z.nwa_kcal
                    kj += z.nwa_kj
                    fett += z.nwa_fett
                    gesfett += z.nwa_gesfett
                    kohlen += z.nwa_kohlen
                    zucker += z.nwa_zucker
                    eiweiss += z.nwa_eiweiss
                    salz += z.nwa_salz
                }
            )
            text.push("".padEnd(8*9-1, "-"))
            text.push(f(kcal, 6, 0) + f(kj, 8, 0) + f(fett, 8, 0) + f(gesfett, 8, 0) + f(kohlen, 8, 0) + f(zucker, 8, 0) + f(eiweiss, 8, 0) + f(salz, 8, 0))
            text.push("  kcal       kJ     Fett gesFetts Kohlenhy   Zucker  Eiweiss     Salz")

        } else if(req.params.art.toLowerCase() == "json") {
            let preis=0, kcal=0, kj=0, fett=0, gesfett =0, kohlen=0, zucker=0, eiweiss=0, salz=0
            let zutaten = {}
            await berechnen(
                id, menge, einheit,
                r => {},
                w => {},
                z => {
                    kcal += z.nwa_kcal
                    kj += z.nwa_kj
                    fett += z.nwa_fett
                    gesfett += z.nwa_gesfett
                    kohlen += z.nwa_kohlen
                    zucker += z.nwa_zucker
                    eiweiss += z.nwa_eiweiss
                    salz += z.nwa_salz

                    let prev = zutaten[z.name] || {g: 0, ml: 0, st: 0}
                    zutaten[z.name] = {
                        g:  prev.g  + (z.menge_.g  || 0),
                        ml: prev.ml + (z.menge_.ml || 0),
                        st: prev.st + (z.menge_.st || 0)
                    }
                },
                l => {
                    preis += l.preis
                }
            )
            res.send({
                preis: preis.toFixed("2").replace(".", ","),
                naehrwertangaben: {
                    kcal: Math.round(kcal),
                    kj: Math.round(kj),
                    fett: Math.round(fett),
                    gesfettsaeuren: Math.round(gesfett),
                    kohlenhydrate: Math.round(kohlen),
                    zucker: Math.round(zucker),
                    eiweiss: Math.round(eiweiss),
                    salz: Math.round(salz),
                },
                zutaten
            })
            return

        } else {
            res.sendStatus(404)
            return
        }
        res.send(text.join("\n"))

    } catch(e) {
        if(e.message.substring(0, 35) == "invalid input syntax for type uuid:") {
            res.sendStatus(404)
            return
        }
        res.status(500).send(e.stack || e)
    }
})
export async function preCheck(id, layer=0, ids=[]) {
    if(ids.includes(id)) throw Error("Das Rezept beinhaltet sich an einer Stelle selbst als Zutat. Bitte beheben sie diese Kreisverbindung.")
    ids.push(id)
    
    let zutaten = await db.query("SELECT zutat AS id FROM mapping WHERE rezept=$1", id)
    if(zutaten.length < 1) return 1
    return Math.max(...(await Promise.all( zutaten.map( async zutat => {
        return await preCheck(zutat.id, layer+1, ids) + 1
    }))))
}


export async function berechnen(id, menge=1, einheit="ST", cbRezept=rezept=>{}, cbZwischenrezept=zwischenrezept=>{},
    cbZutat=zutat=>{}, cbLieferant=lieferant=>{}, layer=0) {
    let [rezept] = await db.query("SELECT * FROM rezepte WHERE id=$1", id)

    let f
    if(einheit == "KG") {
        f = rezept.menge_g == 0 ? 0 : menge * 1000/ rezept.menge_g
    } else if(einheit == "G") {
        f = rezept.menge_g == 0 ? 0 : menge / rezept.menge_g
    } else if(einheit == "ST") {
        f = rezept.menge_st == 0 ? 0 : menge / rezept.menge_st
    } else if(einheit == "L") {
        f = rezept.menge_ml == 0 ? 0 : menge * 1000 / rezept.menge_ml
    } else if(einheit == "ML") {
        f = rezept.menge_ml == 0 ? 0 : menge / rezept.menge_ml
    } else {
        throw Error(`Einheit muss eines der folgenden Möglichkeiten sein: KG | G | ST | L | ML. Gegeben: ${einheit} (${id})`)
    }
    
    if(rezept.art == "Z") {
        cbZutat({
            name: rezept.name,
            menge_: {
                g: rezept.menge_g * f,
                ml: rezept.menge_ml * f,
                st: rezept.menge_st * f,
            },
            allergen: rezept.allergen,
            nwa_kcal: rezept.nwa_kcal * f,
            nwa_kj: rezept.nwa_kj * f,
            nwa_fett: rezept.nwa_fett * f,
            nwa_gesfett: rezept.nwa_gesfett * f,
            nwa_kohlen: rezept.nwa_kohlen * f,
            nwa_zucker: rezept.nwa_zucker * f,
            nwa_eiweiss: rezept.nwa_eiweiss * f,
            nwa_salz: rezept.nwa_salz * f,
            menge,
            einheit,
            faktor: f,
            layer
        })
        let lieferanten = await db.query("SELECT * FROM lieferanten WHERE rezept=$1", id)
        let lieferantenAnteilGesamt = lieferanten.reduce((p, c) => p + c.anteil, 0)
        return await Promise.all( lieferanten.map( lieferant => {
            f = lieferantenAnteilGesamt == 0 ? 0 : f * lieferant.anteil / lieferantenAnteilGesamt
            cbLieferant({
                name: lieferant.name,
                datum: lieferant.datum,
                preis: Number(lieferant.preis.replace(",", ".")) * f,
                faktor: f,
                layer: layer + 1
            })
        }))
    }

    let r = {
        name: rezept.name,
        menge,
        einheit,
        faktor: f,
        layer
    }
    if(rezept.art == "R") {
        cbRezept(r)
    } else if(rezept.art == "W") {
        cbZwischenrezept(r)
    } else {
        throw Error(`Art muss eines der folgenden Möglichkeiten sein: R | W | Z. Gegeben: ${rezept.art} (${id})`)
    }
    let zutaten = await db.query("SELECT * FROM mapping WHERE rezept=$1", id)
    await Promise.all( zutaten.map( zutat => {
        return berechnen(zutat.zutat, zutat.menge*f, zutat.einheit, cbRezept, cbZwischenrezept, cbZutat, cbLieferant, layer+1)
    }))
}

let f = format
function format(value, length, afterDot=-1, spaceAtEnd=true) {
    if(afterDot >= 0) value = value.toFixed(afterDot).padStart(length, " ")
    if(spaceAtEnd)    length++
    return String(value).padEnd(length, " ")
}

export default routes