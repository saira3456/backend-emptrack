export class CreateEmployeeDto {
  name: string;
  email: string;
  phone: string;
  position: string;
  departmentId: number; 
  joinDate: Date;
  status: string;
  password: string;
}