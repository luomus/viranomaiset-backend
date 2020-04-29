import { organizations } from '../config.local';

interface IPerson {
    id: string;
    fullName: string;
    emailAddress: string;
}

export interface IColOrganization {
    id: string;
    collectionName: {
        fi: string;
        sv: string;
        en: string;
    };
    person?: IPerson[];
    children?: IColOrganization[];
}

export class OrganizationService {
    public getUsers(): IColOrganization[] {
        return organizations;
    }
}
