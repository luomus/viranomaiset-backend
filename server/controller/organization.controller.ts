import { Request, Response } from 'express';
import { LoggerService, LOG_SUCCESS, LOG_INVALID_TOKEN } from '../service/logger.service.js';
import { OrganizationService } from '../service/organization.service.js';
import { ErrorMessageEnum } from '../models/models.js';

export class OrganizationController {
  constructor(
    private organizationService: OrganizationService
  ) {}

  public getUsers(req: Request, res: Response) {
    if (this.canSendSuccessResponse(req, res)) {
      res.status(200).send(this.organizationService.getUsers(req.query.includeExpired === 'true'));
    }
  }

  public async getUser(req: Request, res: Response) {
    if (this.canSendSuccessResponse(req, res)) {
      res.status(200).send(await this.organizationService.getUser(req.params.id));
    }
  }

  private canSendSuccessResponse(req: Request, res: Response): boolean {
    if (!this.userQueryTokenIsValid(req)) { // check that the request contains the same token as the logged-in user
      this.logRequest(req, LOG_INVALID_TOKEN);
      res.status(403).send({error: ErrorMessageEnum.invalidToken});
      return false;
    }

    this.logRequest(req, LOG_SUCCESS);
    return true;
  }

  private userQueryTokenIsValid(req: Request): boolean {
    return req.query['token'] === req.user.publicToken;
  }

  private logRequest(req: Request, action: string) {
    LoggerService.info({
      user: req.user.id,
      action,
      request: {
        method: req.method,
        url: req.url,
      },
      remote: req.connection.remoteAddress || '',
    });
  }
}
