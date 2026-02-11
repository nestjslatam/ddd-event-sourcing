import { Injectable } from '@nestjs/common';
import { MaterializedViewManager } from '@nestjslatam/es';

/**
 * Account Summary View - Quick overview of account
 */
export interface AccountSummaryView {
  accountId: string;
  holderName: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * Account Statistics View - Aggregated statistics
 */
export interface AccountStatisticsView {
  accountId: string;
  totalDeposits: number;
  totalWithdrawals: number;
  transactionCount: number;
  averageTransactionAmount: number;
}

/**
 * Service for managing account materialized views
 */
@Injectable()
export class AccountViewService {
  constructor(private readonly viewManager: MaterializedViewManager) {}

  /**
   * Get account summary with caching
   */
  async getAccountSummary(accountId: string): Promise<AccountSummaryView> {
    return this.viewManager.getOrCreate(
      `account-summary-${accountId}`,
      async () => {
        // In a real app, this would query the read model
        return {
          accountId,
          holderName: 'John Doe',
          balance: 1000,
          currency: 'USD',
          lastUpdated: new Date(),
        };
      },
      60000, // 1 minute TTL
    );
  }

  /**
   * Get account statistics with caching
   */
  async getAccountStatistics(
    accountId: string,
  ): Promise<AccountStatisticsView> {
    return this.viewManager.getOrCreate(
      `account-stats-${accountId}`,
      async () => {
        // In a real app, this would aggregate from events
        return {
          accountId,
          totalDeposits: 5000,
          totalWithdrawals: 2000,
          transactionCount: 15,
          averageTransactionAmount: 466.67,
        };
      },
      300000, // 5 minutes TTL
    );
  }

  /**
   * Invalidate all views for an account
   */
  invalidateAccount(accountId: string): void {
    this.viewManager.invalidatePattern(new RegExp(`^account-.*-${accountId}$`));
  }
}
