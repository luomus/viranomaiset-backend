import { Router } from "express";
import * as bodyParser from 'body-parser';
import { AuthController } from '../controller/auth.controller';
import { ApiController } from '../controller/api.controller';

const jsonParser = bodyParser.text({
  type: ['application/+json', 'application/json', 'text/plain']
});

export class ApiRoutes {

  public router: Router;
  public apiController: ApiController = new ApiController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.all('*', AuthController.authenticated, jsonParser, this.apiController.pipe);
  }
}
