import { NextFunction, Request, Response } from 'express';
import * as passport from 'passport';

import { allowedLogin, lajiAuthUrl, systemId } from '../config.local';

export class UserController {

  private getNextFromRequestHost(req: Request) {
    const {host} = req.headers;
    return this.getNext(host);
  }

  private getNext(taskNumber: string) {
    const taskMatch = taskNumber?.match(/^\d+/);
    return taskMatch ? "vir-" + taskMatch[0] : undefined;
  }

  public async checkUser(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      return res.redirect(`/user/login?token=${req.user['publicToken']}&next=${req.query.next || ''}`);
    }
    const next = this.getNextFromRequestHost(req);
    res.render('user/login', {
      allowedLogin: allowedLogin,
      systemId: systemId,
      lajiAuthUrl: lajiAuthUrl,
      hasError: typeof req.query.error !== 'undefined',
      next
    });
  }

  public authenticateUser(req: Request, res: Response, next: NextFunction) {
    const nextParam = this.getNextFromRequestHost(req);
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect('/user/viranomaiset?error');
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        res.redirect(`/user/login?token=${req.user['publicToken']}&next=${nextParam || ''}`);
      });
    })(req, res, next);
  }
}
