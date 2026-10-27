import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import type { AppRequest } from './request';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.session?.userId) throw new UnauthorizedException('Please sign in.');
    const user = await this.database.db('users').select('id','name','email').where('id',request.session.userId).first();
    if (!user) throw new UnauthorizedException('Please sign in.');
    request.user=user; return true;
  }
}
