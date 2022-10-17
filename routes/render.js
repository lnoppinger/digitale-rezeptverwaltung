const routes = require("express")()

const db = require("../modules/db")


routes.get("/", (req, res) => {
    res.render("home")
})


routes.get("/rezept", (req, res) => {
    res.render("rezept")
})
routes.get("/rezept/bearbeiten", (req, res) => {
    res.render("rezept-bearbeiten")
})


routes.get("/zutat", (req, res) => {
    res.render("zutat")
})
routes.get("/zutat/bearbeiten", (req, res) => {

    res.render("zutat-bearbeiten")
})


routes.get("/berechnen/preis", (req, res) => {
    res.render("berechnen", {
        title: "Preis Berechnen",
        apiLastPath: "preis"
    })
})
routes.get("/berechnen/zutaten", (req, res) => {
    res.render("berechnen", {
        title: "Zutaten Berechnen",
        apiLastPath: "zutaten"
    })
})


module.exports = routes