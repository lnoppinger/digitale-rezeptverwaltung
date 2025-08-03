const routes = require("express")()
const excelJS = require("exceljs")

require("dotenv").config()
const db = require("../../modules/db")
const berechnen = require("../../modules/berechnen")

routes.get("/alle", async (req, res) => {
    try {
        let qRes = await db.selectJSON(
            "rezept",
            [
                "rezept.id as id",
                "rezept.name as name",
                "rezept_art.name as rezept_art"
            ],
            `JOIN rezept_art
                ON rezept.rezept_art_id = rezept_art.id
            WHERE NOT rezept_art.name ='Zutat'
            ORDER BY rezept.name ASC`
        )

        res.json({
            rezepte: qRes
        })

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.get("/export", async (req, res) => {
    try {
        let qRes = await db.selectJSON(
            "rezept",
            [
                "rezept.id as id"
            ],
            `JOIN rezept_art
                ON rezept.rezept_art_id = rezept_art.id
            WHERE rezept_art.name ='Rezept'`
        )

        let workbook = new excelJS.Workbook()
        let worksheetN = workbook.addWorksheet("Nährwertangaben")
        let worksheetP = workbook.addWorksheet("Preis")
        
        worksheetN.columns = [
            {
                header: "Name",
                key: "name"
            },
            {
                header: "Energie (kj)",
                key: "gesamt_nwa_energie_kj"
            },
            {
                header: "Energie (kcal)",
                key: "gesamt_nwa_energie_kcal"
            },
            {
                header: "Fett",
                key: "gesamt_nwa_fett"
            },
            {
                header: "Gesättigte Fettsäuren",
                key: "gesamt_nwa_ges_fettsaeuren"
            },
            {
                header: "Kohlenhydrate",
                key: "gesamt_nwa_kohlenhydrate"
            },
            {
                header: "Zucker",
                key: "gesamt_nwa_zucker"
            },
            {
                header: "Eiweiss",
                key: "gesamt_nwa_eiweiss"
            },
            {
                header: "Salz",
                key: "gesamt_nwa_salz"
            }
        ]

        worksheetP.columns = [
            {
                header: "Name",
                key: "name"
            },
            {
                header: "Preis",
                key: "gesamt_preis"
            }
        ]

        await Promise.all(qRes.map( async rezept => {
            let daten = await berechnen(rezept.id)
            workbook.eachSheet( worksheet => {
                worksheet.addRow(daten)
            })
        }) || [])

        let fileName = "Warenwirtschaft Export " + new Date(Date.now()).toLocaleDateString("de-De", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats')
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName + ".xlsx");
        
        await (await workbook).xlsx.write(res)

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})


routes.get("/:id", async (req, res) => {
    try {

        let qResRezept = await db.selectJSON(
            "rezept",
            [
                "rezept.id as id",
                "rezept.name as name",
                "rezept.rezept_art_id as rezept_art_id",
                "rezept.einheit_id as einheit_id",
                "rezept.menge as menge"
            ],
            `JOIN rezept_art
                ON rezept.rezept_art_id = rezept_art.id
            WHERE NOT rezept_art.name = 'Zutat' AND rezept.id = ${req.params.id}`
        )

        if(qResRezept.length <= 0) {
            res.status(400).send(`Es existiert keine Zutat mit der id '${req.params.id}'`)
            return
        }

        if(qResRezept[0].menge == null) {
            qResRezept[0].menge = 0
        }

        qResRezept[0].menge = Math.round(qResRezept[0].menge / process.env.MENGE_FAKTOR)

        let qResZutaten = await db.selectJSON(
            "rezept",
            [
                "rezept.id as id",
                "rezept.name as name",
                "einheit.name as einheit",
                "rezept_map.menge as menge",
                "rezept_art_id = (SELECT id FROM rezept_art WHERE name='Zutat') as ist_zutat"
            ],
            `JOIN rezept_art
                ON rezept.rezept_art_id = rezept_art.id
            JOIN rezept_map
                ON rezept_map.zutat_id = rezept.id
            JOIN einheit
                ON einheit.id = rezept.einheit_id
            WHERE rezept_map.rezept_id = ${req.params.id}`
        )
        qResZutaten = qResZutaten.map(z => {
            z.menge = z.menge / process.env.MENGE_FAKTOR
            return z
        })

        let qResEinheit = await db.selectJSON(
            "einheit",
            [
                "id",
                "name"
            ]
        )

        let qResRezeptArt = await db.selectJSON(
            "rezept_art",
            [
                "id",
                "name"
            ],
            "WHERE NOT name = 'Zutat'"
        )

        let qResZutatenOptional = await db.selectJSON(
            "rezept",
            [
                "rezept.id as id",
                "rezept.name as name",
                "einheit.name as einheit",
            ],
            `JOIN einheit
                ON einheit.id = rezept.einheit_id`
        )

        res.json({
            rezept: qResRezept[0],
            zutaten: qResZutaten,
            einheit: qResEinheit,
            rezeptArt: qResRezeptArt,
            zutatenOptional: qResZutatenOptional
        })

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})


routes.post("/:id", async (req, res) => {
    try {
        let rezeptDaten = req.body.rezept 
        delete rezeptDaten.id

        if(rezeptDaten.menge) {
            rezeptDaten.menge = Math.round(rezeptDaten.menge * process.env.MENGE_FAKTOR)
        }
        
        await db.updateJSON(
            "rezept",
            rezeptDaten,
            `WHERE id = ${req.params.id}`
        )

        // Anzahl an Varianten anpassen
        let count = await db.selectJSON(
            "rezept_map",
            [
                "COUNT(zutat_id)"
            ],
            `WHERE rezept_id = ${req.params.id}`
        )
        count = count[0].count

        if(count > req.body.zutaten.length) {
            await db.query(`DELETE FROM rezept_map WHERE id IN (SELECT id FROM rezept_map WHERE rezept_id=${req.params.id} LIMIT ${count - req.body.zutaten.length})`)
        } else if( count < req.body.zutaten.length) {
            await db.query(`INSERT INTO rezept_map (rezept_id) SELECT ${req.params.id} FROM generate_series(1, ${req.body.zutaten.length - count})`)
        }

        // varianten Hinzufügen
        let ids = await db.selectJSON(
            "rezept_map",
            [
                "id"
            ],
            `WHERE rezept_id = ${req.params.id}`
        )

        // Name in id umwandeln (Menge wird übergeben)
        let promisesId = req.body.zutaten.map( z => {
            return db.selectJSON(
                "rezept",
                [
                    "id",
                    `'${z.menge}' as menge`,
                    `'${z.name}' as name`
                ],
                `WHERE name = '${z.name}'`
            )
        })
        let zutatIds = await Promise.all(promisesId)

        // ids herausfiltern und überprüfen, ob Zutat existiert + Menge umrechnen
        let zutatIds_ = zutatIds.map(z => {
            if(z.length < 1) {
                throw Error(`'${z[0].name}' ist weder ein Rezept noch eine Zutat`)
            }

            if(z[0].id == req.params.id) {
                throw Error(`Das Rezept kann nicht als Zutat von sich selbst hinzugefügt werden`)
            }

            menge = z[0].menge?.replace(/[^0-9.,]/g, "").replace(/,/g, ".")
            if(isNaN(menge)) {
                throw Error(`Die Menge der Zutat '${z.name}' muss eine Zahl sein`)
            }

            return {
                id: z[0].id,
                menge: Math.round(menge * process.env.MENGE_FAKTOR)
            }
        })

        // Zutaten Einfügen
        let promisesEinfuegen = []
        for(let i=0; i<zutatIds_.length; i++) {
            let z = zutatIds_[i]
            promisesEinfuegen.push( db.updateJSON(
                "rezept_map",
                {
                    zutat_id: z.id,
                    menge: z.menge,
                    rezept_id: req.params.id
                },
                `WHERE id=${ids[i].id}`
            ))
        }

        await Promise.all(promisesEinfuegen)        

        res.sendStatus(200)
        
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})


routes.put("/", async (req, res) => {
    try {
        let qRes = await db.insertJSON(
            "rezept",
            {
                name: "Neues Rezept",
                einheit_id: "(SELECT id FROM einheit WHERE name='St.')",
                rezept_art_id: "(SELECT id FROM rezept_art WHERE name='Rezept')",
                menge: Math.round(1 * process.env.PREIS_FAKTOR)
            },
            "RETURNING id"
        )

        if(qRes.length <= 0) {
            throw Error("Rezept konnte nicht erstellt werden")
        }

        res.json({
            id: qRes[0].id
        })

    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})

routes.delete("/:id", async (req, res) => {
    try {
        await db.deleteRow("rezept", `WHERE id = ${req.params.id}`)
        await db.deleteRow("rezept_map", `WHERE rezept_id = ${req.params.id}`)

        res.sendStatus(200)
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
})



module.exports = routes