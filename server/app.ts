import express, { Application } from 'express';
import path, { dirname } from 'path';
import compression from 'compression';
import expressSession from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { ApiRoutes } from './route/api.routes.js';
import { domain, secret } from './config.local.js';
import { serverPort } from './config.js';
import { AuthController } from './controller/auth.controller.js';
import { UserRoutes } from './route/user.routes.js';
import mustacheExpress from 'mustache-express';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


function setRoutes(app: Application): void {
  app.use('/api/', AuthController.authenticated, new ApiRoutes().router);
  app.use('/user/', new UserRoutes().router);
  app.all('*other', function (req, res) {
    const {host} = req.headers;
    const taskMatch = host?.match(/^\d+/)?.[0];
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).sendFile(path.join(
      __dirname,
      taskMatch
        ? `../../vir-tasks/${taskMatch}/index.html`
        : '/../client/index.html'
    ));
  });
}

function setConfig(app: Application): void {
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false,
    referrerPolicy: {policy: 'same-origin'}
  }));
  app.use(compression());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.text());
  app.use(bodyParser.json());
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
      maxAge: 172800000
    }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.engine('mustache', mustacheExpress());
  app.set('port', process.env.PORT || serverPort || 4000);
  app.set('view engine', 'mustache');
  app.set('views', __dirname + '/views');
  app.use(express.static(path.join(__dirname, '/../client'), {index: false}));

  // minimalistic info on error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
    res.status(err.status || 500);
    res.json({
      error: {},
      message: err.message
    });
  });
}

const app: Application = express();

setConfig(app);
setRoutes(app);

export default app;
