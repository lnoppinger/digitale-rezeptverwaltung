require("dotenv").config()
const app = require('express')()


// Logging
const morgan = require('morgan')
app.use( morgan(":method :status :response-time ms :url"))


app.use( require("./routes/routes") )


// Start server
const port = process.env.PORT || 3000
const host = "0.0.0.0"

app.listen(port, host, () => {
    console.log(`Server running at ${process.env.BASE_URL || "https://localhost:" + port}`)
})