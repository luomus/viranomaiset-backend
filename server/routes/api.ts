import { Router, Response } from 'express';
import { isAuthenticated } from '../auth/laji-auth';
import { apiUrl, accessToken, logPath } from '../config.local';
import * as httpRequest from 'request';
import * as winston from 'winston';

const apiRouter: Router = Router();

let currentDate;
let logger: any;

apiRouter.all('*', isAuthenticated, (req: any, res: Response) => {
  // convert public query to private
  const url = req.url
    .replace('/query/', '/private-query/');

  // logout also from the backend when logging out
  if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
    req.logout();
    req.session.destroy((err) => {

    });
  }
  getLogger().info({
    user: req.user && req.user.qname || '[unknown]',
    query: url,
    remote: req.connection.remoteAddress || ''
  });
  req.pipe(httpRequest(
    apiUrl + url.replace('_personToken_', req.user['token']),
    {
      headers: {
        'accept': 'application/json',
        'authorization': accessToken
      }
    }
  )).pipe(res);
});

function getLogger(): any {
  const now = new Date();
  const today = now.toISOString().substring(0, 7) + '.log';
  if (currentDate !== today) {
    currentDate = today;
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.File)({ filename: logPath + currentDate})
      ]
    });
  }
  return logger;
}

export { apiRouter };
