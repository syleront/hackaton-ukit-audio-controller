export interface RequestParams {
    headers?: Record<string, string>;
    formData?: FormData;
    body?: any;
}
export declare type RequestType = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
declare const _default: {
    _get(url: any, params: any, options: any): Promise<unknown>;
    _post(type: RequestType, url: string, params?: RequestParams, options?: Record<string, any>): Promise<unknown>;
    get(url: string, params?: RequestParams, options?: Record<string, any>): Promise<any>;
    post(url: string, params?: RequestParams, options?: Record<string, any>): Promise<any>;
    patch(url: string, params?: RequestParams, options?: Record<string, any>): Promise<any>;
    delete(url: string, params?: RequestParams, options?: Record<string, any>): Promise<any>;
    put(url: string, params?: RequestParams, options?: Record<string, any>): Promise<any>;
};
export default _default;
