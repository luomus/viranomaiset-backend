import { NextFunction, Request, Response } from 'express';
import * as passport from 'passport';

import { allowedLogin, lajiAuthUrl, systemId } from '../config.local';

function getNextFromRequestHost(req: Request) {
  const {host} = req.headers;
  return getNext(host);
}

function getNext(taskNumber: string) {
  const taskMatch = taskNumber?.match(/^\d+/);
  return taskMatch ? "vir-" + taskMatch[0] : 'vir';
}

export class UserController {

  public async checkUser(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      console.log('redirect user');
      return res.redirect(`/user/login?token=${req.user['publicToken']}&next=${req.query.next || ''}`);
    }
    const next = getNextFromRequestHost(req);
    res.render('user/login', {
      allowedLogin: allowedLogin,
      systemId: systemId,
      lajiAuthUrl: lajiAuthUrl,
      hasError: typeof req.query.error !== 'undefined',
      next
    });
  }

  public authenticateUser(req: Request, res: Response, next: NextFunction) {
    const nextParam = getNextFromRequestHost(req);
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        console.log('redirect user err');
        return res.redirect('/user/viranomaiset?error');
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        console.log('redirect user login');
        res.redirect(`/user/login?token=${req.user['publicToken']}&next=${nextParam || ''}`);
      });
    })(req, res, next);
  }
}
