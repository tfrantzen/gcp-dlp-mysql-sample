# Google Data Loss Prevention (DLP) and MySQL Demo
A sample script to run Google Data Loss Prevention (DLP) API on a MySQL database


## Objectives
This data loss prevention inspect pipeline will:
* Connect to MySQL database
* Convert MySQL query response to a Google DLP table request
* Inspect the table request for specified PII


## Before you begin

1. MySQL instance.
1. Enable the [Data Loss Prevention API][dlp-api] in your Cloud Console project.
1. Downloaded [service account credentials][service-account] and set the
  `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to them.
  
        export GOOGLE_APPLICATION_CREDENTIALS = <PATH_TO_YOUR_CREDENTIALS_FILE>
        
1. Basic familiarity with [NodeJS][nodejs] programming.

[dlp-api]: https://console.cloud.google.com/apis/api/dlp.googleapis.com/overview?project=_
[service-account]: https://console.cloud.google.com/apis/credentials?project=_
[nodejs]: https://nodejs.org/


## Prepare the app

1. Initialize a `package.json` file with the following command (set `server.js` as your entry point):

        npm init

1. Install dependencies:

        npm install --save nconf @google-cloud/dlp mysql

1. Create a `mysqlConnector.js` file with the following contents:

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
        
1. Create a `dlpConnector.js` file with the following contents:

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

1. Create a `server.js` file with the following contents:

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
        
1. Create a `keys.json` file witht the following content, replacing the variables with your own values:

        {
          "mysqlHost":"YOUR_MYSQL_HOST",
          "mysqlDb":"YOUR_MYSQL_DATABASE",
          "mysqlTable":"YOUR_MYSQL_TABLE",
          "mysqlUser":"YOUR_MYSQL_USERNAME",
          "mysqlPwd":"YOUR_MYSQL_PASSWORD"
        }
   Do not check your credentials into source control. Create a `.gitignore` file if you don't have one, and add `keys.json` to it.
   
   
## Run the app
1. Run the app locally:

        npm start
