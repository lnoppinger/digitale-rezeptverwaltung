import express from "express"
import { db, rezeptEinheitTypes } from "../../globals.js"
const routes = express() 

routes.get("/rezept/:id/berechnen/:art", async (req, res) => {
    try {
        let menge = 1
        let einheit = "ST"

        let data = await db.query("SELECT id FROM rezepte WHERE owner=$1 AND id=$2", [req.oidc.user.sub, req.params.id])
        if(data.length < 1) {
            res.sendStatus(404)
            return
        }
        let id = data[0].id

        let max = await preCheck(id)
        let text = []
        if(req.params.art.toLowerCase() == "rezepte") {
            await berechnen(
                id, req.oidc.user.sub, menge, einheit,
                r => text.push(f("", r.layer*4) + f(r.menge, 6, 2) + f(r.einheit, 2) + "(" + f(r.faktor, 7, 3, false) + "x) " + f(r.name, 60)),
                w => text.push(f("", w.layer*4) + f(w.menge, 6, 2) + f(w.einheit, 2) + "(" + f(w.faktor, 7, 3, false) + "x) "+ f(w.name, 60)),
                z => text.push(f("", z.layer*4) + f(z.menge, 6, 2) + f(z.einheit, 2) + "(" + f(z.faktor, 7, 3, false) + "x) "+ f(z.name, 60)),
                l => {},
                t => text.push(f("", t.layer*4) + t.text)
            )

        } else if(req.params.art.toLowerCase() == "zutaten") {
            await berechnen(
                id, req.oidc.user.sub, menge, einheit,
                r => {},
                w => {},
                z => {
                    let s = `${z.allergen ? "(A)" : "  "} ${z.name}`
                    if(!text.includes(s)) text.push(s)
                },
                l => {},
                t => text.push(f("", t.layer*4) + t.text)
            )

        } else if(req.params.art.toLowerCase() == "preis") {
            let gesamtPreis = 0
            await berechnen(
                id, req.oidc.user.sub, menge, einheit,
                r => text.push(f("", r.layer*4) + f(r.menge, 6, 2) + f(r.einheit, 2) + f(r.name, 60)),
                w => text.push(f("", w.layer*4) + f(w.menge, 6, 2) + f(w.einheit, 2) + f(w.name, 60)),
                z => text.push(f("", z.layer*4) + f(z.menge, 6, 2) + f(z.einheit, 2) + f(z.name, 60)),
                l => {
                    text.push(f("", max*4) + f(l.name, 20) + f(l.preis, 7, 3) + "(" + l.datum + ")")
                    gesamtPreis += l.preis
                },
                t => text.push(f("", t.layer*4) + t.text)
            )
            text.push(f("", max*4+21) + f("--------", 7))
            text.push(f("", max*4+8) + "Gesamtpreis: " + f(gesamtPreis, 7, 3))

        } else if(req.params.art.toLowerCase() == "naehrwertangaben") {
            let kcal=0, kj=0, fett=0, gesfett =0, kohlen=0, zucker=0, eiweiss=0, salz=0
            await berechnen(
                id, req.oidc.user.sub, menge, einheit,
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
                },
                t => text.push(f("", t.layer*4) + t.text)
            )
            text.push("".padEnd(8*9-1, "-"))
            text.push(f(kcal, 6, 0) + f(kj, 8, 0) + f(fett, 8, 0) + f(gesfett, 8, 0) + f(kohlen, 8, 0) + f(zucker, 8, 0) + f(eiweiss, 8, 0) + f(salz, 8, 0))
            text.push("  kcal       kJ     Fett gesFetts Kohlenhy   Zucker  Eiweiss     Salz")

        } else if(req.params.art.toLowerCase() == "json") {
            let preis=0, kcal=0, kj=0, fett=0, gesfett =0, kohlen=0, zucker=0, eiweiss=0, salz=0
            let zutaten = {}
            await berechnen(
                id, req.oidc.user.sub, menge, einheit,
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
                l => preis += l.preis,
                t => text.push(`${t.text} bei: ${t.name}`)
            )
            if(text.length > 0) {
                text.push("Dadurch kann es zu Fehler bei der Berchnung kommen.")
                text.push("Kalkulieren Sie dieses Rezept um nähere Informationen zu bekommen")
            }
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
                zutaten,
                text: text.join("\n")
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


export async function berechnen(id, userId, menge=1, einheit="ST", cbRezept=rezept=>{}, cbZwischenrezept=zwischenrezept=>{},
    cbZutat=zutat=>{}, cbLieferant=lieferant=>{}, cbText=text=>{}, layer=0) {
    let [rezept] = await db.query("SELECT * FROM rezepte WHERE owner=$1 AND id=$2", [userId, id])
    if(isNaN(menge)) menge = 0

    let f
    if(einheit == "KG") {
        f = menge * 1000 / rezept.menge_g
    } else if(einheit == "G") {
        f = menge / rezept.menge_g
    } else if(einheit == "ST") {
        f = menge / rezept.menge_st
    } else if(einheit == "L") {
        f = menge * 1000 / rezept.menge_ml
    } else if(einheit == "ML") {
        f = menge / rezept.menge_ml
    } else {
        throw Error(`Einheit muss eines der folgenden Möglichkeiten sein: KG | G | ST | L | ML. Gegeben: ${einheit} (${id})`)
    }
    if(isNaN(f) || !isFinite(f)) f=0
    
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
        if(lieferanten.length < 1) cbText({
            name: rezept.name,
            text: "!!! Zutat hat keine Lieferanten !!!",
            layer: layer + 1
        })
        let lieferantenAnteilGesamt = lieferanten.reduce((p, c) => p + c.anteil, 0)
        for(let lieferant of lieferanten) {
            f = lieferantenAnteilGesamt == 0 ? 0 : f * lieferant.anteil / lieferantenAnteilGesamt
            cbLieferant({
                name: lieferant.name,
                datum: lieferant.datum,
                preis: Number(lieferant.preis.replace(",", ".")) * f,
                faktor: f,
                layer: layer + 1
            })
        }
        return
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
    let zutaten = await db.query("SELECT zutat, menge FROM mapping JOIN rezepte ON mapping.zutat = rezepte.id WHERE rezepte.owner=$1 AND mapping.rezept=$2", [userId, id])
    if(zutaten.length < 1) cbText({
        name: rezept.name,
        text: "!!! Rezept hat keine Zutat !!!",
        layer: layer + 1
    })
    for(let zutat of zutaten) {
        await berechnen(zutat.zutat, userId, zutat.menge*f, zutat.einheit, cbRezept, cbZwischenrezept, cbZutat, cbLieferant, cbText, layer+1)
    }
}

let f = format
function format(value, length, afterDot=-1, spaceAtEnd=true) {
    if(afterDot >= 0) value = value.toFixed(afterDot).padStart(length, " ")
    if(spaceAtEnd)    length++
    return String(value).padEnd(length, " ")
}

export default routes