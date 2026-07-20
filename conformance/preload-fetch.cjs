// rdf-test-suite 2.2 expects a Node Readable response body. Node's native
// fetch supplies a Web ReadableStream, which this runner can silently abandon.
const crossFetch = require('cross-fetch');

globalThis.fetch = crossFetch.fetch;
globalThis.Headers = crossFetch.Headers;
globalThis.Request = crossFetch.Request;
globalThis.Response = crossFetch.Response;
