import { Router } from "express";
import { UserController } from '../controller/user.controller';

export class UserRoutes {

  public router: Router;
  public userController: UserController = new UserController();

  constructor() {
    this.router = Router();
    this.routes();
  }

  routes() {
    this.router.get('/viranomaiset', this.userController.checkUser);
    this.router.post('/viranomaiset', this.userController.authenticateUser);
  }
}
