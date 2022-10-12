import { Router } from 'express';
import * as bodyParser from 'body-parser';
import { AuthController } from '../controller/auth.controller';
import { ApiController } from '../controller/api.controller';
import { OrganizationService } from '../service/organization.service';
import { TriplestoreService } from '../service/triplestore.service';

const jsonParser = bodyParser.text({
  type: ['application/+json', 'application/json', 'text/plain']
});

const triplestoreService = new TriplestoreService();

export class ApiRoutes {

  public router: Router;
  public apiController: ApiController = new ApiController(
    new OrganizationService(triplestoreService)
  );

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get('/file-download', AuthController.authenticated, jsonParser, (req, res) => this.apiController.fileDownload(req, res));
    this.router.get('/authorities', AuthController.authenticated, jsonParser, (req, res) => this.apiController.getUsers(req, res));
    this.router.get('/authorities/:id', AuthController.authenticated, jsonParser, (req, res) => this.apiController.getUser(req, res));
    this.router.all('*', AuthController.authenticated, jsonParser, (req, res) => this.apiController.pipe(req, res));
  }
}
