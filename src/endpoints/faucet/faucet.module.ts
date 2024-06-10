import { Module } from '@nestjs/common';
import { TransactionModule } from '../transactions/transaction.module';
import { AccountModule } from '../accounts/account.module';
import { ApiConfigModule } from 'src/common/api-config/api.config.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { FaucetService } from './faucet.service';
import { FaucetController } from './faucet.controller';

@Module({
  imports: [
    TransactionModule,
    AccountModule,
    ApiConfigModule,
    DynamicModuleUtils.getCacheModule(),
  ],
  controllers: [FaucetController],
  providers: [FaucetService],
  exports: [FaucetService],
})
export class FaucetModule { }
