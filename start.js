import express from "express"
import morgan from "morgan"
import {auth} from "express-openid-connect"
import crypto from "crypto"
import { db, config } from "./globals.js"
const app = express()

let version
let versionData
let thisMajorVersion = process.env.npm_package_version.split(".")[0]
try {
    versionData = await db.query("SELECT value FROM globals WHERE key='version'")

} catch(e) {
    await db.none("CREATE TABLE globals(key VARCHAR(30) PRIMARY KEY, value JSONB)")
}
try {
    version = JSON.parse(versionData[0].value)
} catch(e) {
    version = {
        major: Number(thisMajorVersion),
        minor: -1,
        bugfix: -1
    }
    await db.query("INSERT INTO globals(key, value) VALUES ('version', $1)", [JSON.stringify(version)])
}
if(version.major != thisMajorVersion) throw Error(`Datenbank mit Version ${version.major} mit Softwareversion ${thisMajorVersion} nicht kompatibel`)
await setupDb(version.minor)
await db.query("UPDATE globals SET value=$1:json WHERE key='version'", [JSON.stringify({
    major:  Number(process.env.npm_package_version.split(".")[0]),
    minor:  Number(process.env.npm_package_version.split(".")[1]),
    bugfix: Number(process.env.npm_package_version.split(".")[2])
})])

app.use(/^(?!\/ping$)/, morgan("common"))

if(config.OIDC_ISSUER_URL != null) {
    app.use(auth({
        authRequired: false,
        issuerBaseURL: config.OIDC_ISSUER_URL,
        baseURL: config.OIDC_BASE_URL,
        clientID: config.OIDC_CLIENT_ID,
        secret: crypto.randomBytes(15).toString('base64url').slice(0, 20),
        idpLogout: true
    }))
} else {
    app.use( (req, res, next) => {
        req.oidc = {
            user: {
                sub: "11111111-1111-1111-1111-111111111111"
            }
        }
        next()
    })
}

app.use(express.json())
app.use((await import("./routes/routes.js")).default)

app.listen(80, "0.0.0.0", () => {
    console.log("Server running at http://localhost")
})

async function setupDb(minorVersion) {
    let mv = minorVersion

    if(mv < 0) {
        // await db.query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
        await db.query(`
CREATE TABLE rezepte (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name VARCHAR(60),
    art CHAR(1),
    menge_g int,
    menge_ml int,
    menge_st int,
    text text,
    nwa_kcal int,
    nwa_kj int,
    nwa_fett int,
    nwa_gesfett int,
    nwa_kohlen int,
    nwa_zucker int,
    nwa_eiweiss int,
    nwa_salz int,
    allergen boolean,
    datum VARCHAR(10),
    owner UUID
);
CREATE TABLE lieferanten (
    name VARCHAR(20),
    rezept UUID REFERENCES rezepte(id),
    anteil int,
    preis VARCHAR(6),
    datum VARCHAR(10)
);

CREATE TABLE mapping (
    zutat UUID REFERENCES rezepte(id),
    rezept UUID REFERENCES rezepte(id),
    menge int,
    einheit VARCHAR(2),
    index int
);`)
        console.info("Prepared Database for version 2.0.x")
    }
}