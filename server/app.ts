import * as express from 'express';
import * as helmet from 'helmet';
import * as path from 'path';
import * as cors from 'cors';
import * as compression from 'compression';
import * as expressSession from 'express-session';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';
import { apiRouter } from './routes/api';
import { userRouter } from './routes/user';
import { env, domain, secret } from './config.local';
const mustacheExpress = require('mustache-express');
const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
const app: express.Application = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(expressSession({
  name: 'viran',
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // this has to be done in the proxy
    httpOnly: true,
    domain: domain,
    path: '/',
    expires: expiryDate
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
app.all('*', function (req, res) {
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
