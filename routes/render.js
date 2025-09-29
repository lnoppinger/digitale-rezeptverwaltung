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


routes.get("/berechnen", (req, res) => {
    res.render("berechnen")
})


module.exports = routes