import { createSparqlHandler } from '../../src/endpoint.js';
import type { D1DatabaseLike } from '../../src/index.js';

interface Env {
  DB: D1DatabaseLike;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createSparqlHandler({ db: env.DB })(request);
  },
};
