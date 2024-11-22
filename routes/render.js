const routes = require("express")()

const db = require("../modules/db")


routes.get("/", (req, res) => {
    res.render("dashboard")
})


routes.get("/rezepte", (req, res) => {
    res.render("rezepte")
})
routes.get("/rezept/bearbeiten", (req, res) => {
    res.render("rezept")
})


routes.get("/zutaten", (req, res) => {
    res.render("zutaten")
})
routes.get("/zutat/bearbeiten", (req, res) => {

    res.render("zutat")
})


routes.get("/berechnen", (req, res) => {
    res.render("berechnen")
})


module.exports = routes