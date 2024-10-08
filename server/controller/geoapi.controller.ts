import { Request, ParamsDictionary, Query, Response } from 'express-serve-static-core';
import { geoApiUrl, geoApiAuth } from '../config.local';
import * as httpRequest from 'request';
import { URL } from 'url';
import { replacePublicTokenInUrl, replacePublicTokenInBody } from '../utils/person-token-utils';

export class GeoapiController {
  async proxyToGeoapi(req: Request<ParamsDictionary, any, any, Query>, res: Response<any>) {
    const url = replacePublicTokenInUrl(req.url, req.user['publicToken'], req.user['token']);

    const apiTarget = new URL(geoApiUrl + 'admin/api' + url);

    const body = replacePublicTokenInBody(req.body, req.user['publicToken'], req.user['token']);

    const request = httpRequest[req.method.toLowerCase()](
      apiTarget.toString(),
      {
        headers: {
          ...req.headers,
          'Host': apiTarget.hostname,
          'Authorization': geoApiAuth
        },
        ...(['GET', 'DELETE'].includes(req.method) ? {} : {body})
      }
    );

    request.on('response', async (response) => {
      // Make sure that we don't return 403 since that causes a redirect.
      const statusCode = response.statusCode === 403
        ? 500
        : response.statusCode

      response.pipe(res.status(statusCode));
    });
  }
}
