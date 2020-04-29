import { Request, Response } from 'express';
import * as httpRequest from 'request';
import { accessToken, apiUrl, allowedQueryHashes } from '../config.local';
import { LoggerService } from '../service/logger.service';
import { sha1 } from 'object-hash';

export class ApiController {

  public pipe(req: Request, res: Response): any {

    const user = req.user && (req.user as any).qname || '[unknown]';

    // convert public query to private
    const url = req.url
      // .replace('/query/', '/private-query/')
      .replace(req.user['token'], '')
      .replace(req.user['publicToken'], req.user['token']) +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + user;

    // change the body to have real token if it's there
    let body = req.body;

    if (!ApiController.isAllowed(url, body)) {
      LoggerService.info({
        user: user,
        action: 'API_REQUEST_DENIED',
        request: {
          method: req.method,
          url,
          body
        },
        hash: ApiController.getQueryHash(body),
        remote: req.connection.remoteAddress || '',
      });
      return res.status(403).send({error: 'query not allowed'});
    }

    if (typeof body === 'string') {
      try {
        const rePublic = new RegExp(req.user['publicToken'], 'g');
        const rePrivate = new RegExp(req.user['token'], 'g');
        body = body
          .replace(rePrivate, '')
          .replace(rePublic, req.user['token']);
      } catch (e) {
        body = '';
      }
    }

    function doRemoteRequest(user: string, url: string, body, req: Request, res: Response<any>) {
      const start = Date.now();
      const apiTarget = new URL(apiUrl + url);
      httpRequest[req.method.toLowerCase()](
        apiTarget.toString(),
        {
          headers: {
            ...req.headers,
            'Host': apiTarget.hostname,
            'content-length': typeof body === 'string' ? body.length : req.headers['content-length'],
            'authorization': accessToken
          },
          ...(['GET', 'DELETE'].includes(req.method) ? {} : {body})
        }
      ).on('end', function () {
        LoggerService.info({
          user: user,
          action: 'API_REQUEST_END',
          request: {
            method: req.method,
            url,
            body
          },
          response: {
            statusCode: res.statusCode,
          },
          hash: ApiController.getQueryHash(body),
          took: (Date.now() - start),
          remote: req.connection.remoteAddress || '',
        });
      }).pipe(res);
    }

    // logout also from the backend when logging out
    if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
      req.logout();
      req.session.destroy(() => {
        doRemoteRequest(user, url, body, req, res);
      });
      LoggerService.info({
        user: user,
        action: 'LOGOUT'
      });
    } else {
      doRemoteRequest(user, url, body, req, res);
    }
  }

  private static isAllowed(url: string, body: string) {
    if (typeof url !== 'string') {
      return false;
    }
    if (!url.includes('/graphql')) {
      return true;
    }
    return allowedQueryHashes.indexOf(ApiController.getQueryHash(body)) !== -1;
  }

  private static getQueryHash(body: string) {
    if (typeof body === 'string') {
      try {
        const data = JSON.parse(body);
        return sha1((data || {}).query);
      } catch (e) {
        console.log(e);
      }
    }
    return '';
  }
}
