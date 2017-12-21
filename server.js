'use strict';
 
 // Import requirements
 const dlpConnector = require('./dlpConnector');
 const mysqlConnector = require('./mysqlConnector');
 const nconf = require('nconf');
 
 // Import MySQL DB arguments for key.json file
 nconf.argv().env().file('keys.json');
 const user = nconf.get('mysqlUser');
 const pwd = nconf.get('mysqlPwd');
 const host = nconf.get('mysqlHost');
 const db = nconf.get('mysqlDb');
 const tbl = nconf.get('mysqlTable');
 
 // define the parameters for the Google DLP API
 const MIN_LIKELIHOOD = 'LIKELIHOOD_UNSPECIFIED';
 const MAX_FINDINGS = '100000';
 // What type of PII are you looking for?
 const INFO_TYPES = [
   {'name':'US_SOCIAL_SECURITY_NUMBER'},
   {'name':'EMAIL_ADDRESS'}
 ];
 // Include value in response
 const INCLUDE_QUOTES = true;  
 
 // Convert MySQL response into DLP table object
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

 mysqlConnector.executeQuery(host, db, user, pwd, 'SELECT * FROM ' + tbl, function(mysql_response) {
   // dlp request
   var dlp_table_request = createDlpTableRequest(mysql_response);

   dlpConnector.inspectTable(dlp_table_request, MIN_LIKELIHOOD, MAX_FINDINGS, INFO_TYPES, INCLUDE_QUOTES, (dlp_findings) => {
     // Write out results
     console.log(dlp_findings);
   });
 });
