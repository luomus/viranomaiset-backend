import { NextFunction, Request, Response } from 'express';
import '../auth/laji-auth.js';

export class AuthController {

  static authenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(403).send('Login Required');
  };
}
