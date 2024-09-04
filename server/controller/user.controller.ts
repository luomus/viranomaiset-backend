import { NextFunction, Request, Response } from 'express';
import * as passport from 'passport';

import { allowedLogin, lajiAuthUrl, systemId } from '../config.local';

function getNextFromRequestHost(req: Request) {
  const {host} = req.headers;
  return getNext(host);
}

function getNext(taskNumber: string) {
  const taskMatch = taskNumber?.match(/^\d+$/);
  return taskMatch ? taskMatch[0] : '';
}

export class UserController {

  public async checkUser(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      return res.redirect(`/user/login?token=${req.user['publicToken']}&next=${req.query.next || ''}`);
    }
    const next = getNextFromRequestHost(req) || (req.query.next as string|undefined) || '';
    res.render('user/login', {
      allowedLogin: allowedLogin,
      systemId: systemId,
      lajiAuthUrl: lajiAuthUrl,
      hasError: typeof req.query.error !== 'undefined',
      next: encodeURIComponent(next)
    });
  }

  public authenticateUser(req: Request, res: Response, next: NextFunction) {
    let nextParam = getNextFromRequestHost(req) || req.body.next || '';
    if (nextParam.match(/^\d+$/)) {
      nextParam = '';
    }
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
        res.redirect(`/user/login?token=${req.user['publicToken']}&next=${encodeURIComponent(nextParam)}`);
      });
    })(req, res, next);
  }
}
