"use strict";
// var app = require("../../server/server");
// var User = app.models.User;

var privateApi = require("../../apiProvider/privateApi.json");
var publicApi = require("../../apiProvider/publicApi.json");

var createHmac = require("crypto").createHmac;

var generator = require("generate-password");

module.exports = function (user) {
  user.getPrivateAPI = async function (id, appName, serviceName) {
    let appId = generateNum(8);

    let clientId = generateNum(32);
    let clientSecret = generateNum(12);

    const hmac = await createHmac("SHA256", clientSecret)
      .update(clientId, "utf-8")
      .digest("base64");

    // console.log("id", appName, serviceName);
    const userD = await user.findById(id);

    userD.updateAttributes({
      applicationDetails: {
        appName: appName,
        appId: appId,
        serviceDetails: [
          {
            serviceName: serviceName,
            serviceCredentials: {
              clientId: hmac,
            },
          },
        ],
      },
    });
    // console.log(userD);
    const savedData = await userD.save();
    return { clientId, clientSecret, savedData };
  };

  user.usePrivateAPI = async function (
    id,
    serviceName,
    clientId,
    clientSecret
  ) {

    let APIs;

    const hmac = await createHmac("SHA256", clientSecret)
      .update(clientId, "utf-8")
      .digest("base64");

    const userD = await user.findById(id);
    // console.log(userD);
    let checkCred = userD.applicationDetails.serviceDetails[0];
    // console.log(userD.applicationDetails.serviceDetails[0]);
    if (checkCred.serviceCredentials.clientId === hmac) {
      Object.entries(privateApi).map((value, key) => {
        if (value.indexOf(serviceName) > -1) {
          APIs = value[1];
          // console.log(value[1])
        }
      });
      return { APIs };
    } else {
      return "not validated to use API";
    }
  };

  user.usePublicAPI = async function () {

    let APIs;

    Object.entries(publicApi).map((value, key) => {
      APIs = value[1];
    });
    return {APIs};
  };

  user.remoteMethod("getPrivateAPI", {
    description: "Returns the app keys and client id for the service used",
    accepts: [
      {
        arg: "userId",
        type: "string",
        required: true,
      },
      {
        arg: "appName",
        type: "string",
        required: true,
      },
      {
        arg: "serviceName",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/getPrivateAPI",
      verb: "get",
    },
    returns: {
      arg: "details",
      type: "object",
    },
  });

  user.remoteMethod("usePrivateAPI", {
    description: "validate the user to access the api",
    accepts: [
      {
        arg: "userId",
        type: "string",
        required: true,
      },
      {
        arg: "serviceName",
        type: "string",
        required: true,
      },
      {
        arg: "clientId",
        type: "string",
        required: true,
      },
      {
        arg: "clientSecret",
        type: "string",
        required: true,
      },
    ],
    http: {
      path: "/usePrivateAPI",
      verb: "get",
    },
    returns: {
      arg: "ApiAccess",
      type: "object",
    },
  });

  user.remoteMethod("usePublicAPI", {
    description: "To get Public API",
    http: {
      path: "/usePublicAPI",
      verb: "get",
    },
    returns: {
      arg: "ApiAccess",
      type: "object",
    },
  });
};

function generateNum(bits) {
  let randomNum = generator.generate({
    length: bits,
    numbers: true,
  });
  return randomNum;
}
