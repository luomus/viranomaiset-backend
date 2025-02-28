import { Request, Response } from 'express';
import httpRequest from 'request';
import { accessToken, apiUrl } from '../config.local.js';
import { LOG_SUCCESS, LoggerService } from '../service/logger.service.js';
import { URL } from 'url';
import { replacePublicTokenInUrl, replacePublicTokenInBody } from '../utils/person-token-utils.js';

export class ApiController {
  public fileDownload(req: Request, res: Response) {
    const address = `${apiUrl}/warehouse/download/secured/${req.query['id']}?personToken=${req.user.token}`;

    res.redirect(302, address);
  }

  public pipe(req: Request, res: Response): any {
    const user = req.user.id;
    // convert public query to private
    const url = replacePublicTokenInUrl(req.url, req.user.publicToken, req.user['token'])
      .replace('/query/', '/private-query/')
      .replace('downloadType=LIGHTWEIGHT', 'downloadType=AUTHORITIES_LIGHTWEIGHT')
      .replace('downloadType=CITABLE', 'downloadType=AUTHORITIES_FULL') +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + user;

    // change the body to have real token if it's there
    const body = replacePublicTokenInBody(req.body, req.user.publicToken, req.user['token']);

    // logout also from the backend when logging out
    if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
      req.logout(() => {
        req.session.destroy(() => {
          this.doRemoteRequest(user, url, body, req, res);
        });
        LoggerService.info({
          user,
          action: 'LOGOUT'
        });
      });
    } else {
      this.doRemoteRequest(user, url, body, req, res);
    }
  }

  private doRemoteRequest(user: string, url: string, body, req: Request, res: Response<any>) {
    const start = Date.now();
    const apiTarget = new URL(apiUrl + url);

    let request;
    if (url.includes('/geo-convert')) {
      request = req.pipe(httpRequest(
        apiTarget.toString(),
        {
          headers: {
            ...req.headers,
            'Host': apiTarget.hostname,
            'authorization': accessToken
          }
        }
      ));
    } else {
      request = httpRequest[req.method.toLowerCase()](
        apiTarget.toString(),
        {
          headers: {
            ...req.headers,
            'Host': apiTarget.hostname,
            'content-length': typeof body === 'string' ? Buffer.byteLength(body) : req.headers['content-length'],
            'authorization': accessToken
          },
          ...(['GET', 'DELETE'].includes(req.method) ? {} : {body})
        }
      );
    }

    request.on('end', function () {
      LoggerService.info({
        user,
        action: LOG_SUCCESS,
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
}
