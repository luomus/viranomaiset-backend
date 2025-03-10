import { Request, Response } from 'express';
import { LoggerService, LOG_SUCCESS } from '../service/logger.service.js';
import { OrganizationService } from '../service/organization.service.js';

export class OrganizationController {
  constructor(
    private organizationService: OrganizationService
  ) {}

  public getUsers(req: Request, res: Response) {
    this.logRequest(req);
    res.status(200).send(this.organizationService.getUsers(req.query.includeExpired === 'true'));
  }

  public async getUser(req: Request, res: Response) {
    this.logRequest(req);
    res.status(200).send(await this.organizationService.getUser(req.params.id));
  }

  private logRequest(req: Request) {
    LoggerService.info({
      user: req.user.id,
      action: LOG_SUCCESS,
      request: {
        method: req.method,
        url: req.url,
      },
      remote: req.connection.remoteAddress || '',
    });
  }
}
