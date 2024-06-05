const express = require('express')
const app = express()
const https = require('https');

// access credentials from environment variable (alternatively use xsenv)
const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES)
const CREDENTIALS = VCAP_SERVICES.xsuaa[0].credentials
//oauth
const OA_CLIENTID = CREDENTIALS.clientid; 
const OA_SECRET = CREDENTIALS.clientsecret;
const OA_ENDPOINT = CREDENTIALS.url;

// endpoint of our client app
app.get('/trigger', function(req, res){       
   doCallEndpoint()
   .then(()=>{
      res.status(202).send('Successfully called remote endpoint.');
   }).catch((error)=>{
      console.log('Error occurred while calling REST endpoint ' + error)
      res.status(500).send('Error while calling remote endpoint.');
   })
});

// helper method to call the endpoint
const doCallEndpoint = function(){
   return new Promise((resolve, reject) => {
      return fetchJwtToken()
         .then((jwtToken) => {

            const options = {
               host:  'providerapp-t.cfapps.us10-001.hana.ondemand.com',
               path:  '/getData',
               method: 'GET',
               headers: {
                  Authorization: 'Bearer ' + jwtToken
               }
            }
            
            const req = https.request(options, (res) => {
               res.setEncoding('utf8')
               const status = res.statusCode 
               if (status !== 200 && status !== 201) {
                  return reject(new Error(`Failed to call endpoint. Error: ${status} - ${res.statusMessage}`))
               }
         
               res.on('data', () => {
                  resolve()
               })
            });
            
            req.on('error', (error) => {
               return reject({error: error})
            });
         
            req.write('done')
            req.end()   
      })
      .catch((error) => {
         reject(error)
      })
   })
}

// jwt token required for calling REST api
const fetchJwtToken = function() {
   return new Promise ((resolve, reject) => {
      const options = {
         host:  OA_ENDPOINT.replace('https://', ''),
         path: '/oauth/token?grant_type=client_credentials&response_type=token',
         headers: {
            Authorization: "Basic " + Buffer.from(OA_CLIENTID + ':' + OA_SECRET).toString("base64")
         }
      }

      https.get(options, res => {
         res.setEncoding('utf8')
         let response = ''
         res.on('data', chunk => {
           response += chunk
         })

         res.on('end', () => {
            try {
               const jwtToken = JSON.parse(response).access_token                
               resolve(jwtToken)
            } catch (error) {
               return reject(new Error('Error while fetching JWT token'))               
            }
         })
      })
      .on("error", (error) => {
         return reject({error: error})
      });
   })   
}

// Start server
app.listen(process.env.PORT || 8080, ()=>{})