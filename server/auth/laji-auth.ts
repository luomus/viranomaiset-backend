import * as passport from 'passport';
import { Strategy } from 'passport-local';
import * as httpRequest from 'request';
import { lajiAuthUrl, systemId, allowedRoles, allowedLogin } from '../config.local';
import * as random from 'crypto-random-string';
import { LoggerService } from '../service/logger.service';

// TODO this needs to be moved away from here if serving more than one instance of this backend
const authorized_users = {};

passport.use('local', new Strategy(
  {
    usernameField: 'token',
    passwordField: 'token',
  },
  function(token, password, done) {
    const tokenUrl = lajiAuthUrl + 'token/' + token;
    httpRequest(tokenUrl, function(error, response, body) {
      if (error) {
        return done(null, false, { message: 'Incorrect credentials' });
      }
      const result: any = JSON.parse(body) || {};
      const userRoles = result.user && result.user.roles || [];
      const hasRightRole  = allowedRoles.some(allowedRole => userRoles.includes(allowedRole));
      const hasRightMethod = allowedLogin.some(allowed => result.source === allowed.method);
      if (response.statusCode == 200 && result.target === systemId && hasRightRole && hasRightMethod) {
        LoggerService.info({
          user: result.user['qname'],
          action: 'LOGIN'
        });
        result.user['token'] = token;
        result.user['publicToken'] = random({length: 64});
        return done(null, result.user);
      }
      return done(null, false, { message: 'Incorrect credentials' });
    });
  }
));

passport.serializeUser(function(user: any, done) {
  authorized_users[user.token] = user;
  done(null, user.token);
});

passport.deserializeUser(function(token: string, done) {
  done(null, authorized_users[token]);
});


