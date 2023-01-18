require('dotenv').config()

const express = require('express')
const app = express()


// Set Templating Engine
app.use( require('express-ejs-layouts') )
app.set('view engine', 'ejs')
app.set("layout", false)


// Parse body
app.use(express.urlencoded({ extended: true}))
app.use(express.json())

app.use( require("express-formidable-v2")())


// Parse cookies
app.use( require('cookie-parser')(process.env.COOKIE_SECRET) )


// Routing
app.use("/", require("./render"))

app.use("/api/zutat", require("./api/zutat"))
app.use("/api/rezept", require("./api/rezept"))
app.use("/api/berechnen",  require("./api/berechnen"))


// static Files
const path = require('path')
app.use( '/', express.static( path.join(__dirname, '../public/') ) )


// Error Handling
app.use( require("./error") )


module.exports = app