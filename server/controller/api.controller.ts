import { Request, Response } from 'express';
import { accessToken, apiUrl } from '../config.local.js';
import { LOG_SUCCESS, LoggerService } from '../service/logger.service.js';
import { replacePublicToken, replacePublicTokenInBody } from '../utils/utils.js';
import { createProxyMiddleware, fixRequestBody, RequestHandler } from 'http-proxy-middleware';

export class ApiController {
  private readonly apiProxy: RequestHandler;

  constructor() {
    this.apiProxy = createProxyMiddleware({
      target: apiUrl,
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody
      },
      headers: {
        authorization: accessToken
      }
    });
  }

  public fileDownload(req: Request, res: Response) {
    const address = `${apiUrl}/warehouse/download/secured/${req.query['id']}?personToken=${req.user.token}`;

    res.redirect(302, address);
  }

  public pipe(req: Request, res: Response) {
    req.url = replacePublicToken(req.url, req.user.publicToken, req.user.token)
      .replace('/query/', '/private-query/')
      .replace('downloadType=LIGHTWEIGHT', 'downloadType=AUTHORITIES_LIGHTWEIGHT')
      .replace('downloadType=CITABLE', 'downloadType=AUTHORITIES_FULL') +
      (req.url.includes('?') ? '&' : '?') + 'personId=' + req.user.id;

    req.body = replacePublicTokenInBody(req.body, req.user.publicToken, req.user.token);

    if (req.url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
      req.logout(() => {
        req.session.destroy(() => {
          this.doRemoteRequest(req, res);
        });
        LoggerService.info({
          user: req.user.id,
          action: 'LOGOUT'
        });
      });
    } else {
      this.doRemoteRequest(req, res);
    }
  }

  private doRemoteRequest(req: Request, res: Response<any>) {
    const start = Date.now();

    void this.apiProxy(req, res);

    res.on('finish', function () {
      LoggerService.info({
        user: req.user.id,
        action: LOG_SUCCESS,
        request: {
          method: req.method,
          url: req.url,
          body: req.body
        },
        response: {
          statusCode: res.statusCode,
        },
        took: (Date.now() - start),
        remote: req.connection.remoteAddress || '',
      });
    });
  }
}
