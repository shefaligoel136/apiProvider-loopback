"use strict";
// var app = require("../../server/server");
// var User = app.models.User;

var privateApi = require("../../apiProvider/privateApi.json");
var publicApi = require("../../apiProvider/publicApi.json");

var createHmac = require("crypto").createHmac;

var generator = require("generate-password");

module.exports = function (user) {
  user.getPrivateAPI = async function (id, appId, serviceName) {
    let clientId = generateNum(32);
    let clientSecret = generateNum(12);

    let APIs;

    const hmac = await createHmac("SHA256", clientSecret)
      .update(clientId, "utf-8")
      .digest("base64");

    Object.entries(privateApi).forEach((value, key) => {
      if (value.indexOf(serviceName) != -1) {
        APIs = value[1];
      } else {
        return { INFO: "Service not available" };
      }
    });

    if (APIs) {
      const userD = await user.update(
        {
          id: id,
        },
        {
          $addToSet: {
            "applicationDetails.$[elem].serviceDetails": {
              serviceName: serviceName,
              serviceCredentials: hmac,
            },
          },
        },
        { arrayFilters: [{ "elem.appId": appId }], multi: true }
      );
      console.log(userD);
      return { clientId, clientSecret, userD, APIs };
    } else {
      return { INFO: "Service not available" };
    }
  };

  user.createApp = async function (id, appName) {
    let appId = generateNum(8);

    await user.update(
      { _id: id },
      {
        $addToSet: {
          applicationDetails: {
            appName: appName,
            appId: appId,
          },
        },
      }
    );

    return user.findById(id);
  };

  user.usePrivateAPI = async function (req, res) {
    let APIs;

    Object.entries(privateApi).forEach((value, key) => {
      if (value.indexOf(req.headers.tokenname) > -1) {
        APIs = value[1];
      }
    });
    if (APIs) {
      return { APIs };
    } else {
      return "Something is wrong";
    }
  };

  user.usePublicAPI = async function () {
    let APIs;
    Object.entries(publicApi).forEach((value, key) => {
      APIs = value[1];
    });
    return APIs;
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
        arg: "appId",
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
        type: "object",
        arg: "req",
        required: true,
        http: {
          source: "req",
        },
      },
      {
        type: "object",
        arg: "res",
        required: true,
        http: {
          source: "res",
        },
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
