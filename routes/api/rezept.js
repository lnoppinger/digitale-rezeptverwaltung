const routes = require("express")()

require("dotenv").config()
const db = require("../../modules/db")

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
            WHERE NOT rezept_art.name ='Zutat'`
        )

        res.json({
            rezepte: qRes
        })

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