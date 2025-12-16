import {
  IBlockchainAuth,
  IBlockchainTransfer,
  IBlockchainHorizon,
  IStatsProvider,
  IBlockchainTransaction,
} from "../types/blockchain";
import { StellarAuth } from "./stellar/auth";
import { StellarHorizonQuery } from "./stellar/horizonQueries";
import { StellarSEP24 } from "./stellar/sep24";
import { StellarStats } from "./stellar/stats";
import { StellarTransaction } from "./stellar/transactions";

export class BlockchainFactory {
  private static authInstances: Map<string, IBlockchainAuth> = new Map();
  private static transferInstances: Map<string, IBlockchainTransfer> =
    new Map();
  private static horizonInstances: Map<string, IBlockchainHorizon> = new Map();
  private static statsInstances: Map<string, IStatsProvider> = new Map();
  private static transactionInstances: Map<string, IBlockchainTransaction> =
    new Map();

  static getAuthProvider(blockchainType: string = "stellar"): IBlockchainAuth {
    if (!this.authInstances.has(blockchainType)) {
      switch (blockchainType) {
        case "stellar":
          this.authInstances.set(blockchainType, new StellarAuth());
          break;
        default:
          throw new Error(
            `Unknown blockchain type for auth: ${blockchainType}`
          );
      }
    }
    return this.authInstances.get(blockchainType)!;
  }

  static getTransferProvider(
    blockchainType: string = "stellar"
  ): IBlockchainTransfer {
    if (!this.transferInstances.has(blockchainType)) {
      switch (blockchainType) {
        case "stellar":
          this.transferInstances.set(blockchainType, new StellarSEP24());
          break;
        default:
          throw new Error(
            `Unknown blockchain type for transfer: ${blockchainType}`
          );
      }
    }
    return this.transferInstances.get(blockchainType)!;
  }

  static getHorizonProvider(
    blockchainType: string = "stellar"
  ): IBlockchainHorizon {
    if (!this.horizonInstances.has(blockchainType)) {
      switch (blockchainType) {
        case "stellar":
          this.horizonInstances.set(blockchainType, new StellarHorizonQuery());
          break;
        default:
          throw new Error(
            `Unknown blockchain type for horizon: ${blockchainType}`
          );
      }
    }
    return this.horizonInstances.get(blockchainType)!;
  }

  static getStatsProvider(blockchainType: string = "stellar"): IStatsProvider {
    if (!this.statsInstances.has(blockchainType)) {
      switch (blockchainType) {
        case "stellar":
          this.statsInstances.set(blockchainType, new StellarStats());
          break;
        default:
          throw new Error(
            `Unknown blockchain type for stats: ${blockchainType}`
          );
      }
    }
    return this.statsInstances.get(blockchainType)!;
  }

  static getTransactionProvider(
    blockchainType: string = "stellar"
  ): IBlockchainTransaction {
    if (!this.transactionInstances.has(blockchainType)) {
      switch (blockchainType) {
        case "stellar":
          this.transactionInstances.set(
            blockchainType,
            new StellarTransaction()
          );
          break;
        default:
          throw new Error(
            `Unknown blockchain type for transaction: ${blockchainType}`
          );
      }
    }
    return this.transactionInstances.get(blockchainType)!;
  }
}
