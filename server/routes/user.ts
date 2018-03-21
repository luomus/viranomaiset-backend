import { Router } from "express";
import { allowedLogin, systemId, lajiAuthUrl } from '../config.local';
import * as passport from 'passport';

const userRouter: Router = Router();

userRouter.get('/viranomaiset', function(req, res) {
  res.render('user/login', {
    allowedLogin: allowedLogin,
    systemId: systemId,
    lajiAuthUrl: lajiAuthUrl
  });
});

userRouter.get('/login/success', function(req, res) {
  res.redirect('/user/login?token=_personToken_');
});

userRouter.post("/viranomaiset", passport.authenticate('login', {
  successRedirect: '/user/login/success',
  failureRedirect: '/user/viranomaiset'
}));

export { userRouter };
