import { Router, Response } from 'express';
import { isAuthenticated, PassportRequest } from '../auth/laji-auth';
import { apiUrl, accessToken } from '../config.local';
import * as httpRequest from 'request';

const apiRouter: Router = Router();

apiRouter.all('*', isAuthenticated, (req: PassportRequest, res: Response) => {
  // convert public query to private
  const url = req.url.replace('/query/', '/private-query/');

  // logout also from the backend when logging out
  if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
    req.logout();
    req.session.destroy();
  }

  req.pipe(httpRequest(
    apiUrl + url,
    {
      method: req.method,
      headers: {
        'accept': 'application/json',
        'authorization': accessToken
      }
    }
  )).pipe(res);
});

export { apiRouter };
