import * as express from 'express';
import * as helmet from 'helmet';
import * as path from 'path';
import * as compression from 'compression';
import * as expressSession from 'express-session';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';
import { ApiRoutes } from './route/api.routes';
import { domain, secret, allowedResourceSources } from './config.local';
import { serverPort } from './config';
import { AuthController } from './controller/auth.controller';
import { UserRoutes } from './route/user.routes';
const mustacheExpress = require('mustache-express');

class Server {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
  }

  public routes(): void {
    this.app.use('/api/', new ApiRoutes().router);
    this.app.use('/user/', new UserRoutes().router);
    this.app.all('*', AuthController.authenticatedWithRedirect, function (req, res) {
      const {host} = req.headers;
      const taskMatch = host?.match(/^\d+/)?.[0];
      res.status(200).sendFile(path.join(
        __dirname,
        taskMatch
        ? `../../vir-tasks/${taskMatch}/index.html`
        : '/../client/index.html'
      ));
    });
  }

  public config(): void {
    this.app.disable('x-powered-by');
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: allowedResourceSources,
          styleSrc: ["'self'", 'cdn.laji.fi', 'fonts.googleapis.com', "'unsafe-inline'"],
          fontSrc: ["'self'", 'cdn.laji.fi', 'fonts.gstatic.com', "'sha256-5cD+sF5UmRfpb/CalLmJdYzf23tFwPPfvsRDWZa59xM='", 'data:'],
          scriptSrc: [
            "'self'",
            "'unsafe-eval'",
            "'sha256-5cD+sF5UmRfpb/CalLmJdYzf23tFwPPfvsRDWZa59xM='",
            'www.google-analytics.com',
            'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/2.2.1/openseadragon.min.js'
          ]
        }
      },
      featurePolicy: {
        features: {
          fullscreen: ["'self'"],
          vibrate: ["'none'"],
          payment: ["'none'"],
          syncXhr: ["'none'"]
        }
      },
      referrerPolicy: {policy: 'same-origin'}
    }));
    this.app.use(compression());
    this.app.use(bodyParser.urlencoded({extended: false}));
    this.app.use(bodyParser.text());
    this.app.use(cookieParser());
    this.app.use(expressSession({
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
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    this.app.engine('mustache', mustacheExpress());
    this.app.set('port', serverPort || process.env.PORT || 4000);
    this.app.set('view engine', 'mustache');
    this.app.set('views', __dirname + '/views');
    this.app.use(express.static(path.join(__dirname, '/../client'), {index: false}));

    // minimalistic info on error
    this.app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      res.status(err.status || 500);
      res.json({
        error: {},
        message: err.message
      });
    });
  }


  public start(): void {
    this.app.listen(this.app.get("port"), () => {
      console.log(
        "Running at http://localhost:%d",
        this.app.get("port")
      );
    });
  }

}

const server = new Server();

server.start();
