import express from "express"
import morgan from "morgan"
import { db, config } from "./globals.js"
import crypto from "crypto"
const app = express()

let thisMajorVersion = process.env.npm_package_version.split(".")[0]
let version = {
    major: Number(thisMajorVersion),
    minor: -1,
    bugfix: -1
}
await db.none("CREATE TABLE IF NOT EXISTS globals(key VARCHAR(30) PRIMARY KEY, value TEXT)")
await db.query("INSERT INTO globals(key, value) VALUES ('version', $1) ON CONFLICT (key) DO NOTHING", JSON.stringify(version))

let versionData = await db.query("SELECT value FROM globals WHERE key='version'")
version = JSON.parse(versionData[0].value)
if(version.major != thisMajorVersion) throw Error(`Datenbank mit Version ${version.major} mit Softwareversion ${thisMajorVersion} nicht kompatibel`)
    
await setupDb(version.minor)
await db.query("UPDATE globals SET value=$1 WHERE key='version'", JSON.stringify({
    major:  Number(process.env.npm_package_version.split(".")[0]),
    minor:  Number(process.env.npm_package_version.split(".")[1]),
    bugfix: Number(process.env.npm_package_version.split(".")[2])
}))
app.use(/^(?!\/ping$).*/, morgan("common"))

if(config.OIDC_ISSUER_URL != null) {
    const {auth} = await import("express-openid-connect")
    app.use(auth({
        authRequired: false,
        issuerBaseURL: config.OIDC_ISSUER_URL,
        baseURL: config.OIDC_BASE_URL,
        clientID: config.OIDC_CLIENT_ID,
        clientSecret: config.OIDC_CLIENT_SECRET,
        secret: crypto.randomBytes(15).toString('base64url').slice(0, 20),
        idpLogout: true,
        authorizationParams: {
            response_type: 'code',
            scope: 'openid profile email roles'
        }
    }), (req, res, next) => {
        if(req.oidc?.user == null)  req.oidc = {
            user: {
                realm_access: {
                    roles: []
                }
            },
            isAuthenticated: () => false
        }
        let isPublic   = ["/icon.png", "material-symbols-outlined.woff2", "/api/events", "/", "/ping"].includes(req.originalUrl)
        let isApiRoute = req.originalUrl.substring(0,4) == "/api"
        let isLoggedIn = req.oidc.isAuthenticated()
        let isAllowed  = req.oidc.user.realm_access.roles.includes("digitale-rezeptverwaltung")

        if(!isPublic && !isLoggedIn && isApiRoute) {
            res.sendStatus(401)

        } else if(!isPublic && !isLoggedIn) {
            res.redirect("/login")

        } else if(!isPublic && !isAllowed) {
            res.status(403).send("Zugriff verweigert\nSie haben nicht die nötigen Berechtigungen.")

        } else {
            next()
        }
    })

} else {
    app.use( (req, res, next) => {
        req.oidc = {
            user: {
                sub: "11111111-1111-1111-1111-111111111111",
                given_name: "Benutzer",
                name: "Benutzer"
            },
            isAuthenticated: () => false
        }
        next()
    })
}


app.use(express.json())
app.use((await import("./routes/routes.js")).default)

app.listen(80, "0.0.0.0", () => {
    console.log(`Server running at http://localhost (v${process.env.npm_package_version})`)
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