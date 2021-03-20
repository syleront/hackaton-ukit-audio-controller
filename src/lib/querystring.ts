export default {
  stringify(obj) {
    if (typeof obj == "object") {
      return Object.entries(obj).map((e) => {
        e[1] = encodeURIComponent(e[1].toString());
        return e.join("=");
      }).join("&");
    } else {
      throw new Error("parameter must be an object");
    }
  },

  parse(string) {
    const params = string.match(/[A-z%0-9\-.]+=[A-z%0-9\-.]+/g);

    if (params !== null) {
      const obj = {};

      params.forEach((e) => {
        const param = e.split("=");
        obj[param[0]] = decodeURIComponent(param[1]);
      });

      return obj;
    } else {
      return null;
    }
  }
};
