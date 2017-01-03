import { Router } from "express";
import { allowedLogin, systemId, lajiAuthUrl } from '../config.local';
import * as passport from 'passport';

const userRouter: Router = Router();

userRouter.get('/virannomaiset', function(req, res) {
  res.render('user/login', {
    allowedLogin: allowedLogin,
    systemId: systemId,
    lajiAuthUrl: lajiAuthUrl
  });
});

userRouter.get('/login/success', function(req, res) {
  res.redirect('/user/login?token=' + req.user);
});

userRouter.post("/virannomaiset", passport.authenticate('login', {
  successRedirect: '/user/login/success',
  failureRedirect: '/user/virannomaiset'
}));

export { userRouter };
