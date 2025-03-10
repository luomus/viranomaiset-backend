import { Router } from 'express';
import { ApiController } from '../controller/api.controller.js';
import { AdminController } from '../controller/admin.controller.js';
import { OrganizationService } from '../service/organization.service.js';
import { TriplestoreService } from '../service/triplestore.service.js';
import { OrganizationController } from '../controller/organization.controller.js';

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
    this.router.get('/file-download', (req, res) => this.apiController.fileDownload(req, res));
    this.router.get('/authorities', (req, res) => this.organizationController.getUsers(req, res));
    this.router.get('/authorities/:id', (req, res) => this.organizationController.getUser(req, res));
    this.router.use('/admin', (req, res) => this.adminController.proxyToLajiAuth(req, res));
    this.router.all('*other', (req, res) => this.apiController.pipe(req, res));
  }
}
