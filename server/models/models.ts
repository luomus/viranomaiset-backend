export enum ErrorMessageEnum {
  loginRequired = 'Login Required',
  invalidToken = 'Invalid Token',
}

export interface User {
  id: string;
  publicToken: string;
  token: string;
}
