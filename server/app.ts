import * as express from 'express';
import * as helmet from 'helmet';
import * as path from 'path';
import * as compression from 'compression';
import * as expressSession from 'express-session';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';
import { apiRouter } from './routes/api';
import { userRouter } from './routes/user';
import { domain, secret } from './config.local';
import { isAuthenticatedWithRedirect } from "./auth/laji-auth";
const mustacheExpress = require('mustache-express');
const app: express.Application = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(compression());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(expressSession({
  name: 'viran',
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // this is done by the proxy
    httpOnly: true,
    sameSite: true,
    domain: domain,
    path: '/',
    maxAge: 3600000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

// api routes
app.use('/api/', apiRouter);
app.use('/user/', userRouter);

// serve the frontend and redirect all rest of the paths to index.html
app.use(express.static(path.join(__dirname, '/../client')));
app.all('*', isAuthenticatedWithRedirect, function (req, res) {
  res.status(200).sendFile(path.join(__dirname, '/../client/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req: express.Request, res: express.Response, next) {
  let err = new Error('Not Found');
  next(err);
});

// production error handler
// no stacktrace leaked to user
app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  res.status(err.status || 500);
  res.json({
    error: {},
    message: err.message
  });
});

export { app }
