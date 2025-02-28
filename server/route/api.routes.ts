import { Router } from 'express';
import bodyParser from 'body-parser';
import { ApiController } from '../controller/api.controller.js';
import { AdminController } from '../controller/admin.controller.js';
import { OrganizationService } from '../service/organization.service.js';
import { TriplestoreService } from '../service/triplestore.service.js';
import { OrganizationController } from '../controller/organization.controller.js';

const jsonParser = bodyParser.text({
  type: ['application/+json', 'application/json', 'text/plain']
});

const triplestoreService = new TriplestoreService();

export class ApiRoutes {

  public router: Router;
  public organizationService = new OrganizationService(triplestoreService);
  public apiController: ApiController = new ApiController();
  public organizationController: OrganizationController = new OrganizationController(this.organizationService);
  public adminController: AdminController = new AdminController(this.organizationService);

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get('/file-download', jsonParser, (req, res) => this.apiController.fileDownload(req, res));
    this.router.get('/authorities', jsonParser, (req, res) => this.organizationController.getUsers(req, res));
    this.router.get('/authorities/:id', jsonParser, (req, res) => this.organizationController.getUser(req, res));
    this.router.use('/admin', jsonParser, (req, res) => this.adminController.proxyToLajiAuth(req, res));
    this.router.all('*all', jsonParser, (req, res) => this.apiController.pipe(req, res));
  }
}
