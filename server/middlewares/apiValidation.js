const app = require("../server");
var createHmac = require("crypto").createHmac;

const privateApi = require("../../apiProvider/privateApi.json");

const validateApi = async (request, response, next) => {
  let url = request.url;
  let iApp;

  //  to find the index of tokenNAME AND URL, FOR VALIDATION

  let tokenName = request.headers.tokenname;

  //get index of url and token name to check if they valid
  const { tokenIndex, urlIndex } = await getIndexOf(tokenName, url);

  if (urlIndex > -1 && tokenIndex > -1) {
    if (validateHeaders()) {
      
      // destructuring

      const {
        accesstoken: accessToken,
        tokenname: tokenName,
        clientid: clientId,
        clientsecret: clientSecret,
        appid: appId,
      } = request.headers;
      
      // find the user
      const userD = await app.models.user.findOne({
        where: {
          _id: accessToken,
        },
      });

      // if user not found
      if (!userD) {
        response.send("invalid user");
      }

      // get application and service details
      iApp = validateAppAndService(userD, appId, iApp, tokenName, response);

      // for find the serviceDetails of the user
      let checkCred = userD.applicationDetails[iApp].serviceDetails[iService];

      if (checkCred.serviceName === tokenName) {
        // get hmac based on clientSecret and clientId
        const hmac = await getHmac(clientSecret, clientId);

        if (checkCred.serviceCredentials === hmac) {
          // if credentials matches, redirect the user to hin given callback URL
          response.send("redirect to the callback url");
        } else {
          response.send("Please check your credentials");
        }
      } else {
        response.send("ReCheck the Resource Name");
      }
    } else {
      response.send("check url or headers");
    }
  } else if (urlIndex > -1) {
    response.send("invalid token");
  } else {
    next();
  }

  function validateHeaders() {
    return (
      request.headers.accesstoken &&
      request.headers.clientid &&
      request.headers.clientsecret &&
      request.headers.appid
    );
  }
};

// to generate hmac based on clientId and Secret
const getHmac = async (clientSecret, clientId) => {
  const hmac = await createHmac("SHA256", clientSecret)
    .update(clientId, "utf-8")
    .digest("base64");
  return hmac;
};

// to find index of url and tokenName for validation
const getIndexOf = (tN, url) => {
  let tokenIndex = -1,
    urlIndex = -1;
  Object.entries(privateApi).every((elem, index) => {
    elem.forEach((data) => {
      console.log(data);
      if (data.indexOf(url) > -1) {
        urlIndex = data.indexOf(url);
        if (elem.indexOf(tN) > -1) {
          tokenIndex = index;
        }
      }
    });
  });
  return { tokenIndex: tokenIndex, urlIndex: urlIndex };
};

function validateAppAndService(userD, appId, iApp, tokenName, response) {
  userD.applicationDetails.forEach((elem, index) => {
    if (elem.appId === appId) {
      iApp = index;
      elem.serviceDetails.forEach((elem, index) => {
        if (elem.serviceName === tokenName) {
          iService = index;
        }
      });
    }
    if (!(iApp > -1 && iService > -1)) {
      response.send("Please check your appId or Servicename");
    }
  });
  return iApp;
}

module.exports = () => validateApi;
