// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-workspace
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

"use strict";

const loopback = require("loopback");
const boot = require("loopback-boot");

const app = (module.exports = loopback());

var createHmac = require("crypto").createHmac;

app.get("/api/users/usePrivateAPI", async function (request, response, next) {

  let iApp = -1, iService = -1;

  const accessToken = request.headers.accesstoken;

  const clientId = request.headers.clientid;
  const clientSecret = request.headers.clientsecret;

  const tokenName = request.headers.tokenname;

  const appId = request.headers.appid;

  const check = await app.models.user.findOne({
    where: {
      _id: accessToken,
    },
  });

  console.log("check", check.applicationDetails)
  check.applicationDetails.forEach((elem, index) => {
    if(elem.appId === appId){
      iApp=index;
      elem.serviceDetails.forEach((elem,index) => {
        if(elem.serviceName === tokenName){
          iService = index
        }
      })
    }
    if(!(iApp>-1 && iService>-1)){
      response.send("Please check your appId or Servicename");
    }
  })

  const userD = await app.models.user.findById(accessToken);

  let checkCred = userD.applicationDetails[iApp].serviceDetails[iService];

  if (checkCred.serviceName === tokenName) {
    const hmac = await createHmac("SHA256", clientSecret)
      .update(clientId, "utf-8")
      .digest("base64");
    console.log(hmac);
    if (checkCred.serviceCredentials === hmac) {
      next();
    } else {
      response.send("Please check your credentials");
    }
  } else {
    response.send("ReCheck the Resource Name");
  }
});

app.start = function () {
  // start the web server
  return app.listen(function () {
    app.emit("started");
    const baseUrl = app.get("url").replace(/\/$/, "");
    console.log("Web server listening at: %s", baseUrl);
    if (app.get("loopback-component-explorer")) {
      const explorerPath = app.get("loopback-component-explorer").mountPath;
      console.log("Browse your REST API at %s%s", baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) app.start();
});
