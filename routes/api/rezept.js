import express from "express"
const routes = express() 
import {updateClients} from "./events.js"
// import excelJS from "exceljs"
import {db, rezeptArtTypes, rezeptEinheitTypes} from "../../modules/globals.js"

routes.get("/liste/:type", async (req, res, next) => {
    try {
        let type = req.params.type.toUpperCase()
        if(!rezeptArtTypes.includes(type) && type != "A") {
            res.sendStatus(404)
            return
        }
        let typeCondition = type == "A" ? "" : "WHERE art=$1"

        let rezepte = await db.query(`SELECT id, name, datum, art FROM rezepte ${typeCondition} ORDER BY name ASC`, type)
        rezepte = await Promise.all( rezepte.map( async rezept => {
            if(rezept.art != "Z") return rezept

            let lieferantenDaten = await db.query("SELECT datum FROM lieferanten WHERE rezept=$1", rezept.id)
            if(lieferantenDaten.length < 1) {
                rezept.datum = "--.--.----"

            } else {
                lieferantenDaten.sort((a, b) => {
                    let [ad, am, aj] = a.datum.split(".")
                    let [bd, bm, bj] = b.datum.split(".")
                    if(aj != bj) return aj - bj
                    if(am != bm) return am - bm
                    return ad - bd
                })
                rezept.datum = lieferantenDaten[0].datum
            }

            return rezept
        }))
        res.send(rezepte)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/rezept/:id", async (req, res) => {
    try {
        let [rezept] = await db.query("SELECT id, name, art, text, menge_g, menge_ml, menge_st, nwa_kcal, nwa_kj, nwa_fett, nwa_gesfett, nwa_kohlen, nwa_zucker, nwa_eiweiss, nwa_salz, allergen FROM rezepte WHERE id=$1", req.params.id)
        if(rezept == null) {
            res.sendStatus(404)
            return
        }

        res.send({
            id: rezept.id,
            name: rezept.name,
            art: rezept.art,
            text: rezept.text,
            allergen: rezept.allergen,
            rezepte: await db.query("SELECT rezepte.name, rezepte.id FROM rezepte JOIN mapping ON rezepte.id = mapping.rezept WHERE mapping.zutat=$1", req.params.id),
            zutaten: await db.query("SELECT rezepte.name, rezepte.id, mapping.menge, mapping.einheit, index FROM rezepte JOIN mapping ON rezepte.id = mapping.zutat WHERE mapping.rezept=$1 ORDER BY mapping.index", req.params.id),
            lieferanten: await db.query("SELECT name, anteil, preis, datum FROM lieferanten WHERE rezept=$1 ORDER BY name ASC", req.params.id),
            menge: {
                g: rezept.menge_g,
                ml: rezept.menge_ml,
                st: rezept.menge_st,
                kg: Math.round(rezept.menge_g / 1000),
                l: Math.round(rezept.menge_ml / 1000)
            },
            naehrwertangaben: {
                kcal: rezept.nwa_kcal,
                kj: rezept.nwa_kj,
                fett: rezept.nwa_fett,
                gesfettsaeuren: rezept.nwa_gesfett,
                kohlenhydrate: rezept.nwa_kohlen,
                zucker: rezept.nwa_zucker,
                eiweiss: rezept.nwa_eiweiss,
                salz: rezept.nwa_salz
            }
        })

    } catch(e) {
        if(e.message.substring(0, 35) == "invalid input syntax for type uuid:") {
            res.sendStatus(404)
            return
        }
        res.status(500).send(e.stack || e)
    }
})

// routes.get("/export", async (req, res) => {
//     try {
//         let qRes = await db.selectJSON(
//             "rezept",
//             [
//                 "rezept.id as id"
//             ],
//             `JOIN rezept_art
//                 ON rezept.rezept_art_id = rezept_art.id
//             WHERE rezept_art.name ='Rezept'`
//         )

//         let workbook = new excelJS.Workbook()
//         let worksheetN = workbook.addWorksheet("Nährwertangaben")
//         let worksheetP = workbook.addWorksheet("Preis")
        
//         worksheetN.columns = [
//             {
//                 header: "Name",
//                 key: "name"
//             },
//             {
//                 header: "Energie (kj)",
//                 key: "gesamt_nwa_energie_kj"
//             },
//             {
//                 header: "Energie (kcal)",
//                 key: "gesamt_nwa_energie_kcal"
//             },
//             {
//                 header: "Fett",
//                 key: "gesamt_nwa_fett"
//             },
//             {
//                 header: "Gesättigte Fettsäuren",
//                 key: "gesamt_nwa_ges_fettsaeuren"
//             },
//             {
//                 header: "Kohlenhydrate",
//                 key: "gesamt_nwa_kohlenhydrate"
//             },
//             {
//                 header: "Zucker",
//                 key: "gesamt_nwa_zucker"
//             },
//             {
//                 header: "Eiweiss",
//                 key: "gesamt_nwa_eiweiss"
//             },
//             {
//                 header: "Salz",
//                 key: "gesamt_nwa_salz"
//             }
//         ]

//         worksheetP.columns = [
//             {
//                 header: "Name",
//                 key: "name"
//             },
//             {
//                 header: "Preis",
//                 key: "gesamt_preis"
//             }
//         ]

//         await Promise.all(qRes.map( async rezept => {
//             let daten = await berechnen(rezept.id)
//             workbook.eachSheet( worksheet => {
//                 worksheet.addRow(daten)
//             })
//         }) || [])

//         let fileName = "Warenwirtschaft Export " + new Date(Date.now()).toLocaleDateString("de-De", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric"
//         })

//         res.setHeader('Content-Type', 'application/vnd.openxmlformats')
//         res.setHeader("Content-Disposition", "attachment; filename=" + fileName + ".xlsx");
        
//         await (await workbook).xlsx.write(res)

//     } catch(e) {
//         res.status(500).send(e.stack || e)
//     }
// })

class BodyError extends Error {}

routes.put("/rezept", async (req, res) => {
    try {
        // Input check + Defaults
        let body = {
            id: req.body.id || null,
            name: req.body.name?.substring(0, 60) || "Neues Rezept",
            art: req.body.art?.toUpperCase() || "R",
            text: req.body.text || "Hier können sie das Rezept hinzufügen",
            allergen: req.body.allergen == true,
            menge: {},
            naehrwertangaben: {}
        }
        if(body.id != null && (await db.query("SELECT id FROM rezepte WHERE id=$1", body.id)).length <= 0) throw new BodyError("Es wurde kein Rezept mit der angegebenen Id gefunden.")
        if(!rezeptArtTypes.includes(body.art)) throw new BodyError("Art muss einer der folgenden Möglichkeiten sein: Z | R | W.")

        for(let key of ["g", "ml", "st"]) {
            body.menge[key] = (req.body.menge == null || isNaN(req.body.menge[key]) || req.body.menge[key] < 0) ? 0 : Number(req.body.menge[key])
        }
        for(let key of ["kcal", "kj", "fett", "gesfettsaeuren", "kohlenhydrate", "zucker", "eiweiss", "salz"]) {
            body.naehrwertangaben[key] = (req.body.naehrwertangaben == null || isNaN(req.body.naehrwertangaben[key]) || req.body.naehrwertangaben[key] < 0) ? 0 : Number(req.body.naehrwertangaben[key])
        }

        body.lieferanten = (req.body.lieferanten || []).map(lieferant => {
            if(lieferant.preis?.match(/^[0-9]{1,},[0-9]{2}$/) == null) throw new BodyError("Lieferant.Preis muss ein Geldbetrag mit 2 Nachkommastellen sein (maximal 999,99).")
            return {
                name: lieferant.name.substring(0, 20) || "Neuer Lieferant",
                anteil: (isNaN(lieferant.anteil) || lieferant.anteil < 0) ? 0 : Number(lieferant.anteil),
                preis: lieferant.preis,
                datum: (lieferant.datum?.match(/^[0-9]{2}.[0-9]{2}.[0-9]{4}$/) == null) ?
                    (new Date()).toLocaleString("de-De", {day: "2-digit", month: "2-digit", year: "numeric"}) :
                    lieferant.datum
            }
        })
        
        body.zutaten = (req.body.zutaten || []).map(zutat => {
            if(zutat.id == null) throw new BodyError("Zutat.Id darf nicht leer sein.")
            if(isNaN(zutat.menge) || zutat.menge < 0) throw new BodyError("Zutat.Menge muss eine ganze positive Zahl sein.")
            if(!rezeptEinheitTypes.includes(zutat.einheit.toUpperCase())) throw new BodyError("Zutat.Einheit muss eine der folgenden Möglichkeiten sein: KG | G | ST | ML | L.")
            return {
                id: zutat.id,
                menge: Number(zutat.menge),
                einheit: zutat.einheit.toUpperCase()
            }
        })

        // Daten ändern
        let datum = (new Date()).toLocaleString("de-De", {day: "2-digit", month: "2-digit", year: "numeric"})
        if(req.body.id == null) {
            let [{id}] = await db.query("INSERT INTO rezepte(name, art, menge_g, menge_ml, menge_st, text, nwa_kcal, nwa_kj, nwa_fett, nwa_gesfett, nwa_kohlen, nwa_zucker, nwa_eiweiss, nwa_salz, allergen, datum)\
                VALUES (${name}, ${art}, ${menge.g}, ${menge.ml}, ${menge.st}, ${text}, ${naehrwertangaben.kcal}, ${naehrwertangaben.kj}, ${naehrwertangaben.fett}, ${naehrwertangaben.gesfettsaeuren},\
                ${naehrwertangaben.kohlenhydrate}, ${naehrwertangaben.zucker}, ${naehrwertangaben.eiweiss}, ${naehrwertangaben.salz}, ${allergen}, ${datum}) RETURNING id", {...body, datum})
            body.id = id
        } else {
            await db.query("UPDATE rezepte SET name=${name}, art=${art}, menge_g=${menge.g}, menge_ml=${menge.ml}, menge_st=${menge.st}, text=${text}, nwa_kcal=${naehrwertangaben.kcal}, nwa_kj=${naehrwertangaben.kj},\
            nwa_fett=${naehrwertangaben.fett}, nwa_gesfett=${naehrwertangaben.gesfettsaeuren}, nwa_kohlen=${naehrwertangaben.kohlenhydrate}, nwa_zucker=${naehrwertangaben.zucker},\
            nwa_eiweiss=${naehrwertangaben.eiweiss}, nwa_salz=${naehrwertangaben.salz}, allergen=${allergen}, datum=${datum} WHERE id=${id}", {...body, datum})
        }

        await db.query("DELETE FROM mapping WHERE rezept=$1", body.id)
        await Promise.all(body.zutaten.map( (zutat, i) => {
            return db.query("INSERT INTO mapping (zutat, rezept, menge, einheit, index) VALUES (${id}, ${rezept}, ${menge}, ${einheit}, ${index})", {...zutat, rezept: body.id, index: i})
        }))

        await db.query("DELETE FROM lieferanten WHERE rezept=$1", body.id)
        await Promise.all(body.lieferanten.map( lieferant => {
            return db.query("INSERT INTO lieferanten(name, rezept, anteil, preis, datum) VALUES (${name}, ${rezept}, ${anteil}, ${preis}, ${datum})", {...lieferant, rezept: body.id})
        }))

        // Sync
        updateClients("update")
        res.send(body)

    } catch (e) {
        if(e.constructor.name == "BodyError") {
            res.status(400)
            res.send(e.message)
            return
        }
        res.status(500).send(e.stack || e)
    }
})

routes.delete("/rezept/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM mapping WHERE rezept=$1 OR zutat=$1", req.params.id)
        await db.query("DELETE FROM lieferanten WHERE rezept=$1", req.params.id)
        await db.query("DELETE FROM rezepte WHERE id=$1", req.params.id)

        updateClients("update")
        res.send({
            id: req.params.id
        })

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})



export default routes