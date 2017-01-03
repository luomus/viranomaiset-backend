import { Request } from "express";
import * as passport from 'passport';
import { Strategy } from 'passport-local';
import * as httpRequest from 'request';
import { lajiAuthUrl, systemId, allowedRoles, allowedLogin } from '../config.local';
import has = Reflect.has;

passport.use('login', new Strategy(
  {
    usernameField: 'token',
    passwordField: 'token',
  },
  function(token, password, done) {
    const tokenUrl = lajiAuthUrl + 'token/' + token;
    httpRequest(tokenUrl, function(error, response, body) {
      const result: any = JSON.parse(body) || {};
      const roles = result.user && result.user.roles || [];
      let hasRightRole = false;
      let hasRightMethod = false;
      for (let i of allowedRoles) {
        if (hasRightRole) {
          break;
        }
        hasRightRole = roles.indexOf(i) !== -1;
      }
      for (let allow of allowedLogin) {
        if (hasRightMethod) {
          break;
        }
        hasRightMethod = result.source === allow.method;
      }
      if (!error && response.statusCode == 200 && result.target === systemId && hasRightRole && hasRightMethod) {
        return done(null, token);
      }
      return done(null, false, { message: 'Incorrect credentials' });
    });
  }
));

passport.serializeUser(function(user: Object, done) {
  done(null, user);
});

passport.deserializeUser(function(token, done) {
  done(null, token);
});

export const isAuthenticated = function (req: PassportRequest, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(403);
};

export interface PassportRequest extends Request {
  logout: () => void;
  isAuthenticated: () => boolean;
  session: any;
}
