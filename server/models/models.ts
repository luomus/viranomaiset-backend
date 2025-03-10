export enum ErrorMessageEnum {
  loginRequired = 'Login Required'
}

export interface User {
  id: string;
  publicToken: string;
  token: string;
}
