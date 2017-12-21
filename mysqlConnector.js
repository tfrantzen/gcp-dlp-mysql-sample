 'use strict';
 
 // import NodeJS mysql API
 const mysql = require('mysql');
 
 // method to execute query against a mysql instance
 function executeQuery(host, db_name, user, pwd, query, cb){
   // create connection to mysql db  
   var connection = mysql.createConnection({
     host: host,
     user: user,
     password: pwd,
     database: db_name
   });

   // query the mysql table for query
   connection.query(
     query,
     (err, results) => {
       if (err) {
         throw err;
       }

       cb(results);
     }
   );
   connection.end();
 }
 
 module.exports = {
   executeQuery: executeQuery
 }
