import express from "express"
import morgan from "morgan"
import { db } from "./globals.js"
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

app.use(/^(?!\/ping).*$/, morgan("common"))

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
    datum VARCHAR(10)
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
//     await db.query(`
// NOTIFY db_change;
// CREATE OR REPLACE FUNCTION notify_event_trigger() RETURNS TRIGGER AS $$
//     BEGIN
//     PERFORM pg_notify('db', '{"new": ' || coalesce(row_to_json(NEW)::TEXT, '{}') || ', "old": ' || coalesce(row_to_json(OLD)::TEXT, '{}') || ', "table": "' || TG_TABLE_NAME::regclass::text || '", "id": "' || coalesce(NEW.id, OLD.id) || '"');
//     RETURN NEW;
//     END;
// $$ LANGUAGE plpgsql;
//         `)
    }
}