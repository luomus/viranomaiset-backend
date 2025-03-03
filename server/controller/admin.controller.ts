import { Request, ParamsDictionary, Query, Response } from 'express-serve-static-core';
import { lajiAuthUrl } from '../config.local.js';
import { OrganizationService } from '../service/organization.service.js';
import { createProxyMiddleware, fixRequestBody, RequestHandler } from 'http-proxy-middleware';
import { updateQueryStringParameter } from '../utils/utils.js';

export class AdminController {
  private readonly adminProxy: RequestHandler;

  constructor(organizationService: OrganizationService) {
    this.adminProxy = createProxyMiddleware({
      target: lajiAuthUrl + 'secureportal-roles',
      changeOrigin: true,
      pathRewrite: (path: string, req: Request) => {
        return updateQueryStringParameter(path, 'personToken', req.user.token)
      },
      on: {
        proxyReq: fixRequestBody,
        proxyRes: response => {
          // Flush organization service users so they can be queried with updated data.
          if (response.statusCode >= 200 && response.statusCode < 400) {
            void organizationService.refreshUsers();
          }
        }
      },
    });
  }

  async proxyToLajiAuth(req: Request<ParamsDictionary, any, any, Query>, res: Response<any>) {
    void this.adminProxy(req, res);
  }
}
