import { User as VirUser } from '../../models/models.js';

declare global {
  namespace Express {
    interface User extends VirUser {}  // eslint-disable-line @typescript-eslint/no-empty-object-type
  }
}
