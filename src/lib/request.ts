import querystring from "./querystring";

export interface RequestParams {
  headers?: Record<string, string>;
  formData?: FormData;
  body?: any;
}

export type RequestType = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export default {
  _get(url, params, options) {
    const xhr = new XMLHttpRequest();
    if (params) url += "?" + querystring.stringify(params);

    xhr.open("GET", url, true);

    if (options) {
      Object.entries(options).forEach((option) => {
        xhr[option[0]] = option[1];
      });
    }

    xhr.send();

    return new Promise((resolve) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        const response = {
          statusCode: xhr.status,
          body: xhr.response,
          xhr
        };

        resolve(response);
      };
    });
  },
  _post(
    type: RequestType,
    url: string,
    params: RequestParams = {},
    options: Record<string, any> = {}
  ) {
    const xhr = new XMLHttpRequest();
    xhr.open(type, url, true);

    let { headers, formData, body } = params;

    if (headers) {
      Object.entries(headers).forEach((header) => {
        xhr.setRequestHeader(header[0], header[1].toString());
      });
    }

    if (formData) {
      body = formData;
    } else if (body instanceof Object) {
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      body = querystring.stringify(body);
    }

    if (options) {
      Object.entries(options).forEach((option) => {
        xhr[option[0]] = option[1];
      });
    }

    xhr.send(body || "");

    return new Promise((resolve) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        const response = {
          statusCode: xhr.status,
          body: xhr.response,
          xhr
        };

        resolve(response);
      };
    });
  },

  async get(url: string, params?: RequestParams, options?: Record<string, any>) {
    return this._get(url, params, options);
  },
  async post(url: string, params?: RequestParams, options?: Record<string, any>) {
    return this._post("POST", url, params, options);
  },
  async patch(url: string, params?: RequestParams, options?: Record<string, any>) {
    return this._post("PATCH", url, params, options);
  },
  async delete(url: string, params?: RequestParams, options?: Record<string, any>) {
    return this._post("DELETE", url, params, options);
  },
  async put(url: string, params?: RequestParams, options?: Record<string, any>) {
    return this._post("PUT", url, params, options);
  }
};
