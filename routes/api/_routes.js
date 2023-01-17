const routes = require("express")()

routes.use("/zutat", require("./zutat"))
routes.use("/rezept", require("./rezept"))
routes.use("/berechnen/:id",  require("./berechnen/"))


module.exports = routes