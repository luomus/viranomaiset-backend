import { Request, Response } from 'express';
import * as httpRequest from 'request';
import { accessToken, apiUrl } from '../config.local';
import { LoggerService } from '../service/logger.service';


export class ApiController {

  public pipe(req: Request, res: Response): any {

    const user = req.user && (req.user as any).qname || '[unknown]';

    // convert public query to private
    const url = req.url
      .replace('/query/', '/private-query/')
      .replace(req.user['token'], '')
      .replace(req.user['publicToken'], req.user['token']) +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + user;

    // change the body to have real token if it's there
    let body = req.body;
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
}
