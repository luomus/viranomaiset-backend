import passport from 'passport';
import { Strategy } from 'passport-local';
import { lajiAuthUrl, systemId, allowedRoles, allowedLogin } from '../config.local.js';
import random from 'crypto-random-string';
import { LoggerService } from '../service/logger.service.js';
import { accessToken, apiUrl } from '../config.local.js';
import { User } from '../models/models.js';
import axios, { AxiosResponse } from 'axios';

// TODO this needs to be moved away from here if serving more than one instance of this backend
const authorized_users = {};

passport.use('local', new Strategy(
  {
    usernameField: 'token',
    passwordField: 'token',
  },
  function(token, password, done) {
    const tokenUrl = lajiAuthUrl + 'token/' + token;

    axios.get(tokenUrl)
      .then((response: AxiosResponse) => {
        const authResult: any = response.data || {};
        const userRoles = authResult.user?.roles || [];
        const hasRightRole  = allowedRoles.some(allowedRole => userRoles.includes(allowedRole));
        const hasRightMethod = allowedLogin.some(allowed => authResult.source === allowed.method);

        if (response.status != 200 || authResult.target !== systemId || !hasRightRole || !hasRightMethod) {
          return done(null, false, { message: 'Incorrect credentials' });
        }

        const apiPersonUrl = `${apiUrl}/person/${token}?access_token=${accessToken}`;
        axios.get(apiPersonUrl)
          .then((response: AxiosResponse) => {
            const apiResult: any = response.data || {};
            const isExpired = apiResult.securePortalUserRoleExpires && new Date(apiResult.securePortalUserRoleExpires) <= new Date();
            if (isExpired) {
              return done(null, false, { message: 'Access expired' });
            }

            const user: User = {
              ...apiResult,
              token,
              publicToken: random({length: 64})
            };
            LoggerService.info({
              user: user.id,
              action: 'LOGIN'
            });
            return done(null, user);
          })
          .catch(() => {
            return done(null, false, { message: 'Couldn\'t fetch user details for auth' });
          })
      }).catch(() => {
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


