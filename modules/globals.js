import pgPromise from "pg-promise"
import dotenv from "dotenv"

// Env Variables
dotenv.config()
export let config = {
    POSTGRES_HOST: "db",
    POSTGRES_PORT: 5432,
    POSTGRES_USER: "postgres",
    POSTGRES_PASSWORD: "postgres",
    POSTGRES_DATABASE: "postgres"
}
for(let key in config) {
    config[key] = process.env[key]
}
console.info(config)

// Database
const pgp = pgPromise() 
export const db = pgp({
    host: config.POSTGRES_HOST,
    port: config.POSTGRES_PORT,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DATABASE,
})

export const rezeptArtMap = {
    Z: "Zutaten",
    R: "Rezepte",
    W: "Zwischenrezepte"
}
export const rezeptArtTypes = Object.keys(rezeptArtMap)
export const rezeptEinheitTypes   = ["KG", "G", "L", "ML", "ST"]