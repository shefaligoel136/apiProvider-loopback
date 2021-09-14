const app = require("../server");

const validateApi = async (request, response, next) => {
  next();
};

module.exports = () => validateApi;
