import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private logger=new Logger(ApiExceptionFilter.name);
  catch(error:any,host:ArgumentsHost){
    const response=host.switchToHttp().getResponse();
    if(error instanceof ZodError){const errors:Record<string,string[]>={};for(const issue of error.issues){const name=issue.path.join('.')||'form';(errors[name]??=[]).push(issue.message);}response.status(422).json({message:'Please check the form fields.',errors});return;}
    if(error instanceof HttpException){const body=error.getResponse();response.status(error.getStatus()).json(typeof body==='string'?{message:body}:body);return;}
    if(error?.code==='ER_DUP_ENTRY'){response.status(422).json({message:'This record already exists in your workspace.'});return;}
    this.logger.error(`Request failed: ${error?.code||error?.name||'unknown_error'}`);response.status(500).json({message:'The request could not be completed. Please try again.'});
  }
}
