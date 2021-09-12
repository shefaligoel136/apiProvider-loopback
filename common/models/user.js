"use strict";
// var app = require("../../server/server");
// var User = app.models.User;

var privateApi = require("../../apiProvider/privateApi.json");
var publicApi = require("../../apiProvider/publicApi.json");

var createHmac = require("crypto").createHmac;

var generator = require("generate-password");

module.exports = function (user) {
  user.getPrivateAPI = async function (id, appName, serviceName) {
    let clientId = generateNum(32);
    let clientSecret = generateNum(12);

    let APIs;

    const hmac = await createHmac("SHA256", clientSecret)
      .update(clientId, "utf-8")
      .digest("base64");
      
    const userD = await user.findOne({
      where: {
        _id: id,
        applicationDetails: { $elemMatch: { appName: appName } },
      },
    });

    console.log("userD", userD);
    if (!userD) {
      return "app not found";
    }
    userD.updateAttributes({
      applicationDetails: [
        {
          appName: appName,
          appId: userD.applicationDetails[0].appId,
          serviceDetails: [
            {
              serviceName: serviceName,
              serviceCredentials: {
                clientId: hmac,
              },
            },
          ],
        },
      ],
    });
    console.log(userD);
    const savedData = await userD.save();
    Object.entries(privateApi).map((value, key) => {
      if (value.indexOf(serviceName) > -1) {
        APIs = value[1];
      }
    });
    return { clientId, clientSecret, savedData, APIs };
  };

  user.createApp = async function (id, appName) {
    let appId = generateNum(8);
    await user.update(
      { _id: id },
      {
        // $addToSet: {
        applicationDetails: [
          {
            appName: appName,
            appId: appId,
          },
        ],
        // },
      }
    );

    return user.findById(id);
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
      if (APIs) {
        return { APIs };
      } else {
        return "Something is wrong";
      }
    } else {
      return "not validated to use API";
    }
  };

  user.usePublicAPI = async function () {
    let APIs;

    Object.entries(publicApi).map((value, key) => {
      APIs = value[1];
    });
    return { APIs };
  };

  user.remoteMethod("createApp", {
    description: "Creates your app",
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
    ],
    http: {
      path: "/createApp",
      verb: "post",
    },
    returns: {
      arg: "details",
      type: "object",
    },
  });

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
