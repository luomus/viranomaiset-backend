import { NextFunction, Request, Response } from 'express';
import * as passport from 'passport';

import { allowedLogin, lajiAuthUrl, systemId } from '../config.local';

export class UserController {

  public async checkUser(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      return res.redirect(`/user/login?token=${req.user['publicToken']}&next=${req.query.next || ''}`);
    }
    const {host} = req.headers;
    const taskMatch = host?.match(/^\d+/);
    const next = taskMatch?.[0];
    res.render('user/login', {
      allowedLogin: allowedLogin,
      systemId: systemId,
      lajiAuthUrl: lajiAuthUrl,
      hasError: typeof req.query.error !== 'undefined',
      next
    });
  }

  public authenticateUser(req: Request, res: Response, next: NextFunction) {
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
        res.redirect(`/user/login?token=${req.user['publicToken']}&next=${req.query.next || ''}`);
      });
    })(req, res, next);
  }
}
