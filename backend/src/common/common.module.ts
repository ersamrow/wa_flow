import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CryptoService } from './crypto.service';
import { AuthGuard } from './auth.guard';
import { QueueService } from './queue.service';
@Global()
@Module({ providers: [DatabaseService, CryptoService, AuthGuard, QueueService], exports: [DatabaseService, CryptoService, AuthGuard, QueueService] })
export class CommonModule {}
