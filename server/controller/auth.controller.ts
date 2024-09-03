import { NextFunction, Request, Response } from "express";
import "../auth/laji-auth";

export class AuthController {

  static authenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.sendStatus(403);
  };

  static authenticatedWithRedirect(req: Request, res: Response, next: NextFunction) {
    if (req.url.startsWith('/user/login') || req.isAuthenticated()) {
      return next();
    }
    res.redirect(`/user/viranomaiset?next=${encodeURIComponent(req.url)}`);
  };
}
