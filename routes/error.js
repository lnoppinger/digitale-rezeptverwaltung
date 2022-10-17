const routes = require('express')()


// Test error Codes
routes.get("/error/:errorCode", (req, res, next) => {
    res.status(req.params.errorCode)
    next()
})


// fallback if nothing responses
routes.use( (req, res, next) => {
    if(res.statusCode < 400) {
        res.status(404)
    }
    next()
})


// send error Codes
routes.use( (req, res) => {
    if(!res.headersSent) {
        res.send()
    }
})


module.exports = routes
