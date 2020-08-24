import { Request, Response } from 'express';
import * as httpRequest from 'request';
import { accessToken, apiUrl, allowedQueryHashes } from '../config.local';
import { LoggerService } from '../service/logger.service';
import { sha1 } from 'object-hash';
import { IColOrganization, OrganizationService } from '../service/organization.service';
import { DownloadRequestService, IDownloadRequest } from '../service/download-request.service';
import { URL } from 'url';

const LOG_DENIED = 'API_REQUEST_DENIED';
const LOG_SUCCESS = 'API_REQUEST_SUCCESS';
const LOG_INVALID_TOKEN = 'API_REQUEST_INVALID_TOKEN';

export class ApiController {

  constructor(
      private organizationService: OrganizationService,
      private downloadRequestService: DownloadRequestService
  ) {}

  public async searchDownloadRequests(req: Request, res: Response): Promise<Response<IDownloadRequest[]>> {
    const user = ApiController.getUserId(req);
    if (!ApiController.isValidQueryToken(req)) {
       return res.status(403).send({error: 'No sufficient rights'})
    }
    return this.downloadRequestService.searchDownloads(req.query as any)
      .then(data => {
        LoggerService.info({
          user,
          action: LOG_SUCCESS,
          request: {
            method: req.method,
            url: req.url,
          },
          response: {
            statusCode: 200,
          },
          remote: req.connection.remoteAddress || '',
        });
        return res.status(200).send(data);
      });
  }

  public getUsers(req: Request, res: Response): Response<IColOrganization[]> {
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
    return res.status(200).send(this.organizationService.getUsers());
  }

  public pipe(req: Request, res: Response): any {
    const user = ApiController.getUserId(req);
    // convert public query to private
    const url = req.url
      .replace('/query/', '/private-query/')
      .replace('downloadType=LIGHTWEIGHT', 'downloadType=AUTHORITIES_LIGHTWEIGHT')
      .replace('downloadType=CITABLE', 'downloadType=AUTHORITIES_FULL')
      .replace(req.user['token'], '')
      .replace(req.user['publicToken'], req.user['token']) +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + user;

    // change the body to have real token if it's there
    let body = req.body;

    if (!ApiController.isAllowedQuery(url, body)) {
      LoggerService.info({
        user,
        action: LOG_DENIED,
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
    } else if (typeof body === 'object' && Object.keys(body).length === 0) {
      body = '';
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
        user,
        action: 'LOGOUT'
      });
    } else {
      doRemoteRequest(user, url, body, req, res);
    }
  }

  private static isAllowedQuery(url: string, body: string) {
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
      }
    }
    return '';
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
    return req.user && (req.user as any).qname || unknown;
  }

}
