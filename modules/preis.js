module.exports = {
    preisDbInEurStr,
    preisEurStrInDb
}

require("dotenv").config()

function preisDbInEurStr(dbValue) {
    if(dbValue == null || isNaN(dbValue)) {
        return "NA"
    }

    let euro = Math.floor(dbValue / process.env.PREIS_FAKTOR)
    let rest = Math.round(dbValue - euro * process.env.PREIS_FAKTOR)

    let anzahlNachkommaStellen = process.env.PREIS_FAKTOR.toString().length -1
    let restStr = rest.toString().padStart(anzahlNachkommaStellen, '0')
    let restStrMaxKurz = restStr.replace(/0+$/, "")
    let restStrMaxKurzMin2 = restStrMaxKurz.padEnd(2, "0")

    return `${euro.toString()},${restStrMaxKurzMin2} €`
}

function preisEurStrInDb(eurStr) {
    if(eurStr == null) {
        return -1
    }

    let eurStrRep = eurStr.replace(/[^0-9.,]/g, "").replace(/,/g, ".")

    let num = Number(eurStrRep)
    if(isNaN(num)) {
        return -1
    }

    return Math.round( num * process.env.PREIS_FAKTOR )
}