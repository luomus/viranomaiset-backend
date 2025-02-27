import { Request, Response } from 'express';
import httpRequest from 'request';
import { accessToken, apiUrl } from '../config.local.js';
import { LoggerService } from '../service/logger.service.js';
import { OrganizationService } from '../service/organization.service.js';
import { URL } from 'url';
import { replacePublicTokenInUrl, replacePublicTokenInBody } from '../utils/person-token-utils.js';

const LOG_SUCCESS = 'API_REQUEST_SUCCESS';
const LOG_INVALID_TOKEN = 'API_REQUEST_INVALID_TOKEN';

export class ApiController {

  constructor(
      private organizationService: OrganizationService
  ) {}

  public fileDownload(req: Request, res: Response) {
    const address = `${apiUrl}/warehouse/download/secured/${req.query['id']}?personToken=${req.user['token']}`;

    res.redirect(302, address);
  }

  public getUsers(req: Request, res: Response) {
    const isInvalidRes = this.userQueryIsInvalid(req, res);
    if (isInvalidRes) {
      return;
    }
    res.status(200).send(this.organizationService.getUsers(req.query.includeExpired === 'true'));
  }

  public async getUser(req: Request, res: Response) {
    const isInvalidRes = this.userQueryIsInvalid(req, res);
    if (isInvalidRes) {
      return;
    }
    res.status(200).send(await this.organizationService.getUser(req.params.id));
  }

  private userQueryIsInvalid(req: Request, res: Response) {
    const user = ApiController.getUserId(req);
    if (!ApiController.isValidQueryToken(req)) {
      return res.status(403).send({error: 'No sufficient rights'})
    }
    LoggerService.info({
      user,
      action: LOG_SUCCESS,
      request: {
        method: req.method,
        url: req.url,
      },
      remote: req.connection.remoteAddress || '',
    });
  }

  public pipe(req: Request, res: Response): any {
    const user = ApiController.getUserId(req);
    // convert public query to private
    const url = replacePublicTokenInUrl(req.url, req.user['publicToken'], req.user['token'])
      .replace('/query/', '/private-query/')
      .replace('downloadType=LIGHTWEIGHT', 'downloadType=AUTHORITIES_LIGHTWEIGHT')
      .replace('downloadType=CITABLE', 'downloadType=AUTHORITIES_FULL') +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + user;

    // change the body to have real token if it's there
    const body = replacePublicTokenInBody(req.body, req.user['publicToken'], req.user['token']);

    function doRemoteRequest(user: string, url: string, body, req: Request, res: Response<any>) {
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

    // logout also from the backend when logging out
    if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
      req.logout(function () {
        req.session.destroy(() => {
          doRemoteRequest(user, url, body, req, res);
        });
        LoggerService.info({
          user,
          action: 'LOGOUT'
        });
      });
    } else {
      doRemoteRequest(user, url, body, req, res);
    }
  }

  private static isValidQueryToken(req: Request) {
    if (!!req.user && req.query['token'] === req.user['publicToken']) {
      return true;
    }
    LoggerService.info({
      user: ApiController.getUserId(req),
      action: LOG_INVALID_TOKEN,
      request: {
        method: req.method,
        url: req.url,
      },
      remote: req.connection.remoteAddress || '',
    });
    return false;
  }

  private static getUserId(req: Request, unknown: string = '[unknown]') {
    return req.user && (req.user as any).id || unknown;
  }

}
