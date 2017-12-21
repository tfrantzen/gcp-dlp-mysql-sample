'use strict';
 
 const google_dlp_api = require('@google-cloud/dlp');
 const mysql = require('mysql');
 const nconf = require('nconf');

 const MIN_LIKELIHOOD = 'LIKELIHOOD_UNSPECIFIED';
 const MAX_FINDINGS = '100000';
 const INFO_TYPES = [
   {'name':'US_SOCIAL_SECURITY_NUMBER'},
   {'name':'EMAIL_ADDRESS'}
 ];
 const INCLUDE_QUOTES = true;

 function createDlpTableRequest(mysqlResponse){
   var table = { headers:[], rows:[] };

   if(mysqlResponse.length === 0) {
     return table;
   }

   // add headers to table items request
   table.headers = [];
   Object.keys(mysqlResponse[0]).forEach(key => {
     table.headers.push({
       columnName : key
     });
   });

   // add values to table items request
   mysqlResponse.forEach(row => {
     var values = [];
     Object.keys(row).forEach(key => {
       values.push({
         stringValue : row[key]
       });
     });

     // final length check
     if(values.length === table.headers.length) {
       table.rows.push({
         values : values
       });
     }
   });
   return table;
 }

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

 function inspectTable(table, minLikelihood, maxFindings, infoTypes, includeQuote, cb) {
   // Instantiates a client
   const dlp = new google_dlp_api.DlpServiceClient();

   // Construct items to inspect
   const items = [{'table':table}];

   // Construct request
   const request = {
     inspectConfig: {
       infoTypes: infoTypes,
       minLikelihood: minLikelihood,
       maxFindings: maxFindings,
       includeQuote: includeQuote,
     },
     items: items,
   };

   // Send request to DLP api
   dlp.inspectContent(request).then(response => {
     // first result is the response
     const dlp_table_result = response[0].results[0].findings;

   cb(dlp_table_result);
   }).catch(err => {
     throw err;
     });
 }

 nconf.argv().env().file('keys.json');
 const user = nconf.get('mysqlUser');
 const pwd = nconf.get('mysqlPwd');
 const host = nconf.get('mysqlHost');
 const db = nconf.get('mysqlDb');
 const tbl = nconf.get('mysqlTable');

 executeQuery(host, db, user, pwd, 'SELECT * FROM ' + tbl, function(mysql_response) {
   // dlp request
   var dlp_table_request = createDlpTableRequest(mysql_response);

   inspectTable(dlp_table_request, MIN_LIKELIHOOD, MAX_FINDINGS, INFO_TYPES, INCLUDE_QUOTES, (dlp_findings) => {
     // Write out results
     console.log(dlp_findings);
   });
 });
