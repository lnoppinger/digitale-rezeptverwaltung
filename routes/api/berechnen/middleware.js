const db = require("../../../modules/db")
require("dotenv").config()

/**
 * 
 * @param {Number} id 
 * @param {Function} callback 
 * @param {Array} ids 
 * @param {Number} menge
 */
 async function getRezeptZutaten(id, callback=(id, menge)=>{}, ids=[], menge=1) {
    if(ids.includes(id)) {
        throw Error("Schleife in den Rezepten gefunden")
    }
    console.log(menge)

    let qRes = await db.selectJSON(
        "rezept",
        [
            "rezept.menge as menge",
        ],
        `WHERE rezept.id=${id}`
    )
    let rezeptMenge = qRes[0].menge

    let qResMap = await db.selectJSON(
        "rezept_map",
        [
            "zutat_id",
            "menge as zutat_menge"
        ],
        `WHERE rezept_map.rezept_id = ${id}`
    )

    if(qResMap.length < 1) {
        callback(id, menge)
    }

    if(rezeptMenge == 0 || rezeptMenge == null) {
        throw Error("Rezeptmenge darf nicht 0 sein")
    }

    await Promise.all( qResMap.map( r => {
        let m = menge / rezeptMenge * r.zutat_menge
        return getRezeptZutaten(r.zutat_id, callback, [...ids, id], m)
    }))
}

async function getAllZutatenIds(req, res, next) {
    try {
        let id = req.params.id

        let zutaten = []
        await getRezeptZutaten(id, (id, menge) => {
            let i = zutaten.findIndex( z => z.id == id)
    
            if(i >= 0) {
                zutaten[i].menge += menge
            } else {
                zutaten.push({
                    id,
                    menge
                })
            }
        })
        
        req.zutaten = zutaten
        console.log(req.zutaten)
    
        next()
    } catch(e) {
        res.status(500).send(e.stack || e)
    }
}

module.exports = {
    getAllZutatenIds
}

