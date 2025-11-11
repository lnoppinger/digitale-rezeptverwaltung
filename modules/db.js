export default  {
    query,
    insertJSON,
    selectJSON,
    updateJSON,
    deleteRow
}

require('dotenv').config()


const pgp = require("pg-promise")()
let db = pgp({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE
})


/**
 * For searching in a database. Autmaticaly reconnects if not already connected. 
 * @param {String} q Querystring in SQL-syntax.
 * @returns {Promise} Result of the search in JSON Array. A failed search results to null.
 */
function query(q) {
    return new Promise( async (resolve, reject) => {

        if(process.env.DEBUG == "true") {
            console.log(q.replace(/\n/g, ""))
        }

        db.any(q)
        .then(data => {
            resolve(data)
        })
        .catch(e => {
            reject(e)
        })
    })
}

/**
 * Updates a row in a table ("" = null)
 * @param {String} table 
 * @param {JSON} data JSON object of the data to which it schould be updated
 * @param {String} end Gets appendend at the end of the query
 */
function updateJSON(table, data, end="") {

    let values = ""
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if(data[key] == null || data[key] == "") {
                values += `${key} = null, `
            } else if( !isNaN(data[key]) || data[key][0] == "(") {
                values += `${key} = ${data[key]}, `
            } else {
                values += `${key} = '${data[key]}', `
            }
        }
    }
    values = values.slice(0, -2)

    return query(`UPDATE ${table} SET ${values} ${end}`)
}

/**
 * Select rows from table
 * @param {String} table 
 * @param {Array} colums Array / String of colums
 * @param {String} end Gets appendend at the end of the query
 */
function selectJSON(table, colums, end="") {

    let c = ""
    colums.forEach( colum => {
        c += `${colum}, `
    })
    c = c.slice(0, -2)

    return query(`SELECT ${c} FROM ${table} ${end}`)
}

/**
 * Inserts a row in table
 * @param {String} table 
 * @param {JSON} data JSON object of the data to which it schould be inserted
 * @param {String} end Gets appendend at the end of the query
 */
function insertJSON(table, data, end="") {
    let values = ""
    let keys = ""
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if(data[key] == null || data[key] == "") {
                values += `null, `
            } else if( !isNaN(data[key]) || data[key][0] == "(") {
                values += `${data[key]}, `
            } else {
                values += `'${data[key]}', `
            }
            keys += `${key}, `
        }
    }
    values = values.slice(0, -2)
    keys = keys.slice(0, -2)

    return query(`INSERT INTO ${table} (${keys}) VALUES (${values}) ${end}`)
}

function deleteRow(table, end) {
    return query(`DELETE FROM ${table} ${end}`)
}