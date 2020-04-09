import { Request, Response } from "express";
import * as httpRequest from 'request';
import { accessToken, apiUrl } from '../config.local';
import { LoggerService } from '../service/logger.service';


export class ApiController {

  public pipe(req: Request, res: Response): any {

    // convert public query to private
    const url = req.url
      .replace('/query/', '/private-query/')
      .replace(req.user['publicToken'], req.user['token']);

    // logout also from the backend when logging out
    if (url.indexOf('/person-token/') === 0 && req.method === 'DELETE') {
      req.logout();
      req.session.destroy((err) => {

      });
    }

    // change the body to have real token if it's there
    let body = req.body;
    if (typeof body === 'string') {
      try {
        const re = new RegExp(req.user['publicToken'], 'g');
        body = body.replace(re, req.user['token']);
      } catch (e) {
        body = '';
      }
    }

    LoggerService.info({
      user: req.user && (req.user as any).qname || '[unknown]',
      query: url,
      remote: req.connection.remoteAddress || '',
      body: body
    });

    httpRequest[req.method.toLowerCase()](
      apiUrl + url,
      {
        headers: {
          ...req.headers,
          Host: 'apitest.laji.fi',
          'authorization': accessToken
        },
        ...(req.method !== 'GET' ? { body } : {})
      }
    ).pipe(res);
  }

}
