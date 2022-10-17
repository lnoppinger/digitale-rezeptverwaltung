const routes = require("express")()

routes.use("/zutat", require("./zutat"))
routes.use("/rezept", require("./rezept"))


routes.use("/berechnen/:id",  require("./berechnen/middleware").getAllZutatenIds)
routes.use("/berechnen/:id/zutaten/", require("./berechnen/zutaten"))
routes.use("/berechnen/:id/preis/", require("./berechnen/preis"))

module.exports = routes