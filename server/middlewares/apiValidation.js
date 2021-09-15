const app = require("../server");
var createHmac = require("crypto").createHmac;

const privateApi = require("../../apiProvider/privateApi.json");
const publicApi = require("../../apiProvider/publicApi.json");

const validateApi = async (request, response, next) => {
  let iApp = -1,
    iService = -1;
  let url = request.url;
  var tokenIndex = -1;
  var urlIndex = -1;
  Object.entries(privateApi).every((elem, index) => {
    if (elem.indexOf(request.headers.tokenname) > -1) {
      tokenIndex = elem.indexOf(request.headers.tokenname);
      console.log(tokenIndex);
      if (tokenIndex > -1) {
        
        elem.forEach((data) => {
          if (data.indexOf(url) > -1) {
            urlIndex = data.indexOf(url);
          }
        });
      }
    }
  });

  console.log(url);
  console.log(tokenIndex);
  console.log(urlIndex);

  if (tokenIndex > -1) {
    if (urlIndex > -1) {
      if (
        request.headers.accesstoken &&
        request.headers.clientid &&
        request.headers.clientsecret &&
        request.headers.tokenname &&
        request.headers.appid
      ) {
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

        console.log("check", check.applicationDetails);
        check.applicationDetails.forEach((elem, index) => {
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

        const userD = await app.models.user.findById(accessToken);

        let checkCred = userD.applicationDetails[iApp].serviceDetails[iService];

        if (checkCred.serviceName === tokenName) {
          const hmac = await createHmac("SHA256", clientSecret)
            .update(clientId, "utf-8")
            .digest("base64");
          console.log(hmac);
          if (checkCred.serviceCredentials === hmac) {
            response.send("redirect to the callback url");
          } else {
            response.send("Please check your credentials");
          }
        } else {
          response.send("ReCheck the Resource Name");
        }
      }
    } else {
      response.send("check url or headers");
    }
  } else {
    next();
  }
};

module.exports = () => validateApi;
