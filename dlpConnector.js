 'use strict';
 
 // import the Google DLP API
 const google_dlp_api = require('@google-cloud/dlp');
 
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
 
 module.exports = {
   inspectTable: inspectTable
 }
