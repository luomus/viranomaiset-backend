import { Request, ParamsDictionary, Query, Response } from 'express-serve-static-core';
import request from 'request';
import { lajiAuthUrl } from '../config.local.js';
import { OrganizationService } from '../service/organization.service.js';

export class AdminController {

  organizationService: OrganizationService;

  constructor(organizationService: OrganizationService) {
    this.organizationService = organizationService;
  }

  async proxyToLajiAuth(req: Request<ParamsDictionary, any, any, Query>, res: Response<any>) {
    const uri = lajiAuthUrl + 'secureportal-roles' + req.url;
    const headers = {
      ...req.headers,
      'Host': new URL(lajiAuthUrl).hostname
    }
    request({uri, method: req.method, qs: {...req.query, personToken: req.user['token']}, headers}).on('response', async (response) => {
      // Flush organization service users so they can be queried with updated data.
      if (response.statusCode >= 200 && response.statusCode < 400) {
        await this.organizationService.refreshUsers();
      }
      // Make sure that we don't return 403 since that causes a redirect.
      const statusCode = response.statusCode >= 400
        ? 400
        : response.statusCode

      response.pipe(res.status(statusCode));
    });
  }
}
