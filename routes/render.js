import express from "express"
import expressLayouts from "express-ejs-layouts";
import { rezeptArtMap, rezeptEinheitTypes } from "../globals.js"
const routes = express() 

routes.set('view engine', 'ejs')
routes.use(expressLayouts)

routes.get("/", (req, res) => {
    res.render("home")
})

for(let rezeptArtKurz in rezeptArtMap) {
    let rezeptArtLang = rezeptArtMap[rezeptArtKurz]

    routes.get("/"+rezeptArtLang.toLowerCase(), (req, res) => {
        res.render("liste", {
            headline: rezeptArtLang,
            rezeptArtKurz,
            rezeptArtLang,
            rezeptArtMap
        })
    })
}

routes.get("/bearbeiten", (req, res) => {
    res.render("bearbeiten", {
        headline: "Bearbeiten",
        rezeptArtMap,
        rezeptEinheitTypes
    })
})

routes.get("/berechnen", (req, res) => {
    res.render("berechnen", {
        headline: "Kalkulation",
    })
})

routes.get("/drucken", (req, res) => {
    res.render("drucken", {
        headline: "Drucken",
    })
})


export default routes