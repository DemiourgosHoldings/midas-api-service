import { Address, Transaction } from '@multiversx/sdk-core/out';
import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { AddressUtils, Constants, OriginLogger } from '@multiversx/sdk-nestjs-common';
import { UserSigner } from "@multiversx/sdk-wallet";
import { BadRequestException, Injectable, NotAcceptableException } from '@nestjs/common';
import { ApiConfigService } from 'src/common/api-config/api.config.service';
import { AccountService } from '../accounts/account.service';
import { TransactionSendResult } from '../transactions/entities/transaction.send.result';
import { TransactionService } from '../transactions/transaction.service';
import { promises } from "fs";
import BigNumber from 'bignumber.js';

@Injectable()
export class FaucetService {
  private readonly logger = new OriginLogger(FaucetService.name);

  private faucetPassword;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly apiConfigService: ApiConfigService,
    private readonly accountService: AccountService,
    private readonly cachingService: CacheService,
  ) {
    this.faucetPassword = this.apiConfigService.getFaucetPassword();
  }

  async sendTokensToAddress(address: string | undefined): Promise<TransactionSendResult> {
    if (!address || !AddressUtils.isAddressValid(address)) {
      throw new NotAcceptableException('Address invalid');
    }

    const fileContent = await promises.readFile('wallet.json', { encoding: "utf8" });
    const walletObject = JSON.parse(fileContent);
    const signer = UserSigner.fromWallet(walletObject, this.faucetPassword);

    this.logger.warn(`Send tokens to address: ${address}`);

    const faucetBech32 = signer.getAddress();

    const nonce = await this.getNonce(faucetBech32.bech32());
    const transaction = new Transaction({
      gasLimit: 1500000,
      sender: faucetBech32,
      receiver: new Address(address),
      value: new BigNumber(5).shiftedBy(18),
      chainID: this.apiConfigService.getChainId(),
      nonce: nonce,
    });
    const signature = await signer.sign(transaction.serializeForSigning());
    transaction.applySignature(signature);

    const transferResult = await this.transactionService.createTransaction(transaction.toSendable());

    if (typeof transferResult === 'string' || transferResult instanceof String) {
      throw new BadRequestException(transferResult);
    }

    return transferResult;
  }

  private async getNonce(address: string): Promise<number> {
    const value = await this.getFaucetNonce();
    if (!value) {
      const accountNonce = await this.getLatestNonce(address);

      await this.setFaucetNonce(accountNonce);

      return accountNonce;
    }

    return await this.incrementFaucetNonce();
  }

  async getLatestNonce(address: string): Promise<number> {
    const account = await this.accountService.getAccount(address);
    if (!account) {
      throw new Error(
        `Could not fetch account details for address '${address}'`,
      );
    }

    return account.nonce;
  }

  async setFaucetNonce(nonce: number) {
    await this.cachingService.setRemote(this.getFaucetNonceKey(), nonce, Constants.oneMonth() * 12);
  }

  async getFaucetNonce(): Promise<number | undefined> {
    return this.cachingService.getRemote(this.getFaucetNonceKey());
  }

  async incrementFaucetNonce(): Promise<number> {
    return this.cachingService.incrementRemote(this.getFaucetNonceKey());
  }

  private getFaucetNonceKey(): string {
    return 'faucetNonce';
  }
}
