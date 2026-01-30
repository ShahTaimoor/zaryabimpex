const mongoose = require('mongoose');
const TransactionRepository = require('../repositories/TransactionRepository');
const ChartOfAccountsRepository = require('../repositories/ChartOfAccountsRepository');
const BalanceSheetRepository = require('../repositories/BalanceSheetRepository');
const Transaction = require('../models/Transaction');
const ChartOfAccounts = require('../models/ChartOfAccounts');
const BalanceSheet = require('../models/BalanceSheet');

class AccountingService {
  /**
   * Validate that an account exists and is active
   * @param {String} accountCode - Account code to validate
   * @returns {Promise<Object>} Account object
   */
  static async validateAccount(accountCode) {
    if (!accountCode || typeof accountCode !== 'string') {
      throw new Error('Account code is required and must be a string');
    }
    const account = await ChartOfAccountsRepository.findOne({ 
      accountCode: accountCode.toUpperCase(),
      isActive: true 
    });
    
    if (!account) {
      throw new Error(`Account code ${accountCode} not found or inactive in Chart of Accounts`);
    }
    
    if (!account.allowDirectPosting) {
      throw new Error(`Account ${accountCode} (${account.accountName}) does not allow direct posting`);
    }
    
    return account;
  }

  /**
   * Get account code by account name and type
   * @param {String} accountName - Account name (partial match)
   * @param {String} accountType - Account type (asset, liability, etc.)
   * @param {String} accountCategory - Account category (optional)
   * @returns {Promise<String>} Account code
   */
  static async getAccountCode(accountName, accountType, accountCategory = null) {
    // Create flexible search patterns for common account name variations
    const namePatterns = {
      'Cash': ['Cash', 'Cash on Hand', 'Cash Account'],
      'Bank': ['Bank', 'Bank Accounts', 'Bank Account'],
      'Accounts Receivable': ['Accounts Receivable', 'Account Receivable', 'AR', 'Receivables'],
      'Inventory': ['Inventory', 'Stock', 'Merchandise'],
      'Accounts Payable': ['Accounts Payable', 'Account Payable', 'AP', 'Payables'],
      'Sales Revenue': ['Sales Revenue', 'Sales', 'Revenue from Sales'],
      'Other Revenue': ['Other Revenue', 'Other Income', 'Miscellaneous Revenue'],
      'Cost of Goods Sold': ['Cost of Goods Sold', 'COGS', 'Cost of Sales'],
      'Other Expenses': ['Other Expenses', 'Miscellaneous Expenses', 'Other Operating Expenses']
    };
    
    // Get search terms for this account name
    const searchTerms = namePatterns[accountName] || [accountName];
    
    // Try each search pattern
    for (const searchTerm of searchTerms) {
      const query = {
        accountName: { $regex: new RegExp(`^${searchTerm}$`, 'i') },
        accountType: accountType,
        isActive: true,
        allowDirectPosting: true
      };
      
      if (accountCategory) {
        query.accountCategory = accountCategory;
      }
      
      const account = await ChartOfAccountsRepository.findOne(query);
      if (account) {
        return account.accountCode;
      }
    }
    
    // Fallback: Try to find by account name pattern (partial match) and type
    const fallbackAccount = await ChartOfAccountsRepository.findOne({
      accountName: { $regex: new RegExp(accountName.split(' ')[0], 'i') }, // Match first word
      accountType: accountType,
      isActive: true,
      allowDirectPosting: true
    });
    
    if (fallbackAccount) {
      return fallbackAccount.accountCode;
    }
    
    // Final fallback: Try to find by account name only (any type)
    const anyTypeAccount = await ChartOfAccountsRepository.findOne({
      accountName: { $regex: new RegExp(accountName.split(' ')[0], 'i') },
      isActive: true
    });
    
    if (anyTypeAccount) {
      console.warn(`Account found but type mismatch: ${accountName}. Expected: ${accountType}, Found: ${anyTypeAccount.accountType}`);
      return anyTypeAccount.accountCode;
    }
    
    throw new Error(`Account not found: ${accountName} (${accountType}${accountCategory ? '/' + accountCategory : ''})`);
  }

  /**
   * Get default account codes (with fallback to hardcoded if not found)
   * @returns {Promise<Object>} Object with account codes
   */
  static async getDefaultAccountCodes() {
    const codes = {};
    
    try {
      codes.cash = await this.getAccountCode('Cash', 'asset', 'current_assets').catch((err) => {
        console.warn(`Account lookup failed for Cash, using fallback '1001':`, err.message);
        return '1001';
      });
      codes.bank = await this.getAccountCode('Bank', 'asset', 'current_assets').catch((err) => {
        console.warn(`Account lookup failed for Bank, using fallback '1002':`, err.message);
        return '1002';
      });
      codes.accountsReceivable = await this.getAccountCode('Accounts Receivable', 'asset', 'current_assets').catch((err) => {
        console.warn(`Account lookup failed for Accounts Receivable, using fallback '1201':`, err.message);
        return '1201';
      });
      codes.inventory = await this.getAccountCode('Inventory', 'asset', 'inventory').catch((err) => {
        console.warn(`Account lookup failed for Inventory, using fallback '1301':`, err.message);
        return '1301';
      });
      codes.accountsPayable = await this.getAccountCode('Accounts Payable', 'liability', 'current_liabilities').catch((err) => {
        console.warn(`Account lookup failed for Accounts Payable, using fallback '2001':`, err.message);
        return '2001';
      });
      codes.salesRevenue = await this.getAccountCode('Sales Revenue', 'revenue', 'sales_revenue').catch((err) => {
        console.warn(`Account lookup failed for Sales Revenue, using fallback '4001':`, err.message);
        return '4001';
      });
      codes.otherRevenue = await this.getAccountCode('Other Revenue', 'revenue', 'other_revenue').catch((err) => {
        console.warn(`Account lookup failed for Other Revenue, using fallback '4200':`, err.message);
        return '4200';
      });
      codes.costOfGoodsSold = await this.getAccountCode('Cost of Goods Sold', 'expense', 'cost_of_goods_sold').catch((err) => {
        console.warn(`Account lookup failed for Cost of Goods Sold, using fallback '5001':`, err.message);
        return '5001';
      });
      codes.otherExpenses = await this.getAccountCode('Other Expenses', 'expense', 'other_expenses').catch((err) => {
        console.warn(`Account lookup failed for Other Expenses, using fallback '5430':`, err.message);
        return '5430';
      });
    } catch (error) {
      console.error('Error loading default account codes, using fallback values:', error);
      // Fallback to hardcoded values if lookup fails
      codes.cash = '1001';
      codes.bank = '1002';
      codes.accountsReceivable = '1201';
      codes.inventory = '1301';
      codes.accountsPayable = '2001';
      codes.salesRevenue = '4001';
      codes.otherRevenue = '4003';
      codes.costOfGoodsSold = '5001';
      codes.otherExpenses = '5430';
    }
    
    return codes;
  }
  /**
   * Create accounting entries for cash receipts
   * @param {Object} cashReceipt - Cash receipt data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordCashReceipt(cashReceipt) {
    try {
      const transactions = [];
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Debit: Cash Account
      const cashTransaction = await this.createTransaction({
        transactionId: `CR-${cashReceipt._id}`,
        orderId: cashReceipt.order || cashReceipt._id, // Use cash receipt ID if no order
        paymentId: cashReceipt._id,
        paymentMethod: cashReceipt.paymentMethod || 'cash',
        type: 'sale',
        amount: cashReceipt.amount,
        currency: 'USD',
        status: 'completed',
        description: `Cash Receipt: ${cashReceipt.particular}`,
        accountCode: accountCodes.cash,
        debitAmount: cashReceipt.amount,
        creditAmount: 0,
        reference: cashReceipt.voucherCode,
        customer: cashReceipt.customer,
        createdBy: cashReceipt.createdBy
      });
      transactions.push(cashTransaction);

      // Credit: Accounts Receivable (if customer payment) or Revenue
      if (cashReceipt.customer) {
        // Customer payment - reduce accounts receivable
        const arTransaction = await this.createTransaction({
          transactionId: `CR-AR-${cashReceipt._id}`,
          orderId: cashReceipt.order || cashReceipt._id, // Use cash receipt ID if no order
          paymentId: cashReceipt._id,
          paymentMethod: cashReceipt.paymentMethod || 'cash',
          type: 'sale',
          amount: cashReceipt.amount,
          currency: 'USD',
          status: 'completed',
          description: `Customer Payment: ${cashReceipt.particular}`,
          accountCode: accountCodes.accountsReceivable,
          debitAmount: 0,
          creditAmount: cashReceipt.amount,
          reference: cashReceipt.voucherCode,
          customer: cashReceipt.customer,
          createdBy: cashReceipt.createdBy
        });
        transactions.push(arTransaction);
      } else {
        // Other income - credit revenue (use Other Revenue, not Sales Revenue)
        const revenueTransaction = await this.createTransaction({
          transactionId: `CR-REV-${cashReceipt._id}`,
          orderId: cashReceipt.order || cashReceipt._id, // Use cash receipt ID if no order
          paymentId: cashReceipt._id,
          paymentMethod: cashReceipt.paymentMethod || 'cash',
          type: 'sale',
          amount: cashReceipt.amount,
          currency: 'USD',
          status: 'completed',
          description: `Other Income: ${cashReceipt.particular}`,
          accountCode: accountCodes.otherRevenue,
          debitAmount: 0,
          creditAmount: cashReceipt.amount,
          reference: cashReceipt.voucherCode,
          createdBy: cashReceipt.createdBy
        });
        transactions.push(revenueTransaction);
      }

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `cash receipt ${cashReceipt.voucherCode || cashReceipt._id}`);

      console.log(`Created ${transactions.length} accounting entries for cash receipt ${cashReceipt._id} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for cash receipt:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for cash payments
   * @param {Object} cashPayment - Cash payment data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordCashPayment(cashPayment) {
    try {
      const transactions = [];
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Credit: Cash Account
      const cashTransaction = await this.createTransaction({
        transactionId: `CP-${cashPayment._id}`,
        orderId: cashPayment.order || cashPayment._id, // Use cash payment ID if no order
        paymentId: cashPayment._id,
        paymentMethod: cashPayment.paymentMethod || 'cash',
        type: 'sale',
        amount: cashPayment.amount,
        currency: 'USD',
        status: 'completed',
        description: `Cash Payment: ${cashPayment.particular}`,
        accountCode: accountCodes.cash,
        debitAmount: 0,
        creditAmount: cashPayment.amount,
        reference: cashPayment.voucherCode,
        supplier: cashPayment.supplier,
        customer: cashPayment.customer,
        createdBy: cashPayment.createdBy
      });
      transactions.push(cashTransaction);

      // Debit: Accounts Payable (if supplier payment) or Expense
      if (cashPayment.supplier) {
        // Supplier payment - reduce accounts payable
        const apTransaction = await this.createTransaction({
          transactionId: `CP-AP-${cashPayment._id}`,
          orderId: cashPayment.order || cashPayment._id, // Use cash payment ID if no order
          paymentId: cashPayment._id,
          paymentMethod: cashPayment.paymentMethod || 'cash',
          type: 'sale',
          amount: cashPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Supplier Payment: ${cashPayment.particular}`,
          accountCode: accountCodes.accountsPayable,
          debitAmount: cashPayment.amount,
          creditAmount: 0,
          reference: cashPayment.voucherCode,
          supplier: cashPayment.supplier,
          createdBy: cashPayment.createdBy
        });
        transactions.push(apTransaction);
      } else if (cashPayment.customer) {
        // Customer refund - debit accounts receivable
        const arTransaction = await this.createTransaction({
          transactionId: `CP-AR-${cashPayment._id}`,
          orderId: cashPayment.order || undefined,
          paymentId: cashPayment._id,
          paymentMethod: cashPayment.paymentMethod || 'cash',
          type: 'refund',
          amount: cashPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Customer Refund: ${cashPayment.particular}`,
          accountCode: accountCodes.accountsReceivable,
          debitAmount: cashPayment.amount,
          creditAmount: 0,
          reference: cashPayment.voucherCode,
          customer: cashPayment.customer,
          createdBy: cashPayment.createdBy
        });
        transactions.push(arTransaction);
      } else {
        // Other expense - debit specified expense account when provided
        let expenseAccountCode = accountCodes.otherExpenses;
        if (cashPayment.expenseAccount) {
          try {
            const expenseAccount = await ChartOfAccounts.findById(cashPayment.expenseAccount).select('accountCode accountName');
            if (expenseAccount?.accountCode) {
              expenseAccountCode = expenseAccount.accountCode;
            } else {
              console.warn(`Expense account ${cashPayment.expenseAccount} not found or missing accountCode. Falling back to Other Expenses.`);
            }
          } catch (lookupError) {
            console.error(`Error resolving expense account ${cashPayment.expenseAccount} for cash payment ${cashPayment._id}:`, lookupError);
          }
        }

        const expenseTransaction = await this.createTransaction({
          transactionId: `CP-EXP-${cashPayment._id}`,
          orderId: cashPayment.order || undefined, // Use undefined instead of null for optional field
          paymentId: cashPayment._id,
          paymentMethod: cashPayment.paymentMethod || 'cash', // Provide payment method
          type: 'sale',
          amount: cashPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Expense: ${cashPayment.particular}`,
          accountCode: expenseAccountCode,
          debitAmount: cashPayment.amount,
          creditAmount: 0,
          reference: cashPayment.voucherCode,
          createdBy: cashPayment.createdBy
        });
        transactions.push(expenseTransaction);
      }

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `cash payment ${cashPayment.voucherCode || cashPayment._id}`);

      console.log(`Created ${transactions.length} accounting entries for cash payment ${cashPayment._id} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for cash payment:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for bank receipts
   * @param {Object} bankReceipt - Bank receipt data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordBankReceipt(bankReceipt) {
    try {
      const transactions = [];
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Debit: Bank Account
      const bankTransaction = await this.createTransaction({
        transactionId: `BR-${bankReceipt._id}`,
        orderId: bankReceipt.order || undefined,
        paymentId: bankReceipt._id,
        paymentMethod: 'bank_transfer',
        type: 'sale',
        amount: bankReceipt.amount,
        currency: 'USD',
        status: 'completed',
        description: `Bank Receipt: ${bankReceipt.particular}`,
        accountCode: accountCodes.bank,
        debitAmount: bankReceipt.amount,
        creditAmount: 0,
        reference: bankReceipt.transactionReference,
        customer: bankReceipt.customer,
        createdBy: bankReceipt.createdBy
      });
      transactions.push(bankTransaction);

      // Credit: Accounts Receivable (if customer payment) or Revenue
      if (bankReceipt.customer) {
        // Customer payment - reduce accounts receivable
        const arTransaction = await this.createTransaction({
          transactionId: `BR-AR-${bankReceipt._id}`,
          orderId: bankReceipt.order || undefined,
          paymentId: bankReceipt._id,
          paymentMethod: 'bank_transfer',
          type: 'sale',
          amount: bankReceipt.amount,
          currency: 'USD',
          status: 'completed',
          description: `Customer Payment: ${bankReceipt.particular}`,
          accountCode: accountCodes.accountsReceivable,
          debitAmount: 0,
          creditAmount: bankReceipt.amount,
          reference: bankReceipt.transactionReference,
          customer: bankReceipt.customer,
          createdBy: bankReceipt.createdBy
        });
        transactions.push(arTransaction);
      } else {
        // Other income - credit revenue (use Other Revenue, not Sales Revenue)
        const revenueTransaction = await this.createTransaction({
          transactionId: `BR-REV-${bankReceipt._id}`,
          orderId: bankReceipt.order || undefined,
          paymentId: bankReceipt._id,
          paymentMethod: 'bank_transfer',
          type: 'sale',
          amount: bankReceipt.amount,
          currency: 'USD',
          status: 'completed',
          description: `Other Income: ${bankReceipt.particular}`,
          accountCode: accountCodes.otherRevenue,
          debitAmount: 0,
          creditAmount: bankReceipt.amount,
          reference: bankReceipt.transactionReference,
          createdBy: bankReceipt.createdBy
        });
        transactions.push(revenueTransaction);
      }

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `bank receipt ${bankReceipt.transactionReference || bankReceipt._id}`);

      console.log(`Created ${transactions.length} accounting entries for bank receipt ${bankReceipt._id} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for bank receipt:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for bank payments
   * @param {Object} bankPayment - Bank payment data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordBankPayment(bankPayment) {
    try {
      const transactions = [];
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Credit: Bank Account
      const bankTransaction = await this.createTransaction({
        transactionId: `BP-${bankPayment._id}`,
        orderId: bankPayment.order || undefined,
        paymentId: bankPayment._id,
        paymentMethod: 'bank_transfer',
        type: 'sale',
        amount: bankPayment.amount,
        currency: 'USD',
        status: 'completed',
        description: `Bank Payment: ${bankPayment.particular}`,
        accountCode: accountCodes.bank,
        debitAmount: 0,
        creditAmount: bankPayment.amount,
        reference: bankPayment.transactionReference,
        supplier: bankPayment.supplier,
        customer: bankPayment.customer,
        createdBy: bankPayment.createdBy
      });
      transactions.push(bankTransaction);

      // Debit: Accounts Payable (if supplier payment) or Expense
      if (bankPayment.supplier) {
        // Supplier payment - reduce accounts payable
        const apTransaction = await this.createTransaction({
          transactionId: `BP-AP-${bankPayment._id}`,
          orderId: bankPayment.order || undefined,
          paymentId: bankPayment._id,
          paymentMethod: 'bank_transfer',
          type: 'sale',
          amount: bankPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Supplier Payment: ${bankPayment.particular}`,
          accountCode: accountCodes.accountsPayable,
          debitAmount: bankPayment.amount,
          creditAmount: 0,
          reference: bankPayment.transactionReference,
          supplier: bankPayment.supplier,
          createdBy: bankPayment.createdBy
        });
        transactions.push(apTransaction);
      } else if (bankPayment.customer) {
        // Customer refund - debit accounts receivable
        const arTransaction = await this.createTransaction({
          transactionId: `BP-AR-${bankPayment._id}`,
          orderId: bankPayment.order || undefined,
          paymentId: bankPayment._id,
          paymentMethod: 'bank_transfer',
          type: 'refund',
          amount: bankPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Customer Refund: ${bankPayment.particular}`,
          accountCode: accountCodes.accountsReceivable,
          debitAmount: bankPayment.amount,
          creditAmount: 0,
          reference: bankPayment.transactionReference,
          customer: bankPayment.customer,
          createdBy: bankPayment.createdBy
        });
        transactions.push(arTransaction);
      } else {
        // Other expense - debit specified expense account when provided
        let expenseAccountCode = accountCodes.otherExpenses;
        if (bankPayment.expenseAccount) {
          try {
            const expenseAccount = await ChartOfAccounts.findById(bankPayment.expenseAccount).select('accountCode accountName');
            if (expenseAccount?.accountCode) {
              expenseAccountCode = expenseAccount.accountCode;
            } else {
              console.warn(`Expense account ${bankPayment.expenseAccount} not found or missing accountCode. Falling back to Other Expenses.`);
            }
          } catch (lookupError) {
            console.error(`Error resolving expense account ${bankPayment.expenseAccount} for bank payment ${bankPayment._id}:`, lookupError);
          }
        }

        const expenseTransaction = await this.createTransaction({
          transactionId: `BP-EXP-${bankPayment._id}`,
          orderId: bankPayment.order || undefined, // Use undefined instead of null for optional field
          paymentId: bankPayment._id,
          paymentMethod: 'bank_transfer', // Bank payment uses bank transfer
          type: 'sale',
          amount: bankPayment.amount,
          currency: 'USD',
          status: 'completed',
          description: `Expense: ${bankPayment.particular}`,
          accountCode: expenseAccountCode,
          debitAmount: bankPayment.amount,
          creditAmount: 0,
          reference: bankPayment.transactionReference,
          createdBy: bankPayment.createdBy
        });
        transactions.push(expenseTransaction);
      }

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `bank payment ${bankPayment.transactionReference || bankPayment._id}`);

      console.log(`Created ${transactions.length} accounting entries for bank payment ${bankPayment._id} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for bank payment:', error);
      throw error;
    }
  }

  /**
   * Validate that transactions are balanced (double-entry bookkeeping)
   * @param {Array} transactions - Array of transaction objects
   * @param {String} reference - Reference identifier for error messages
   * @returns {Promise<Object>} Balance information {totalDebits, totalCredits}
   */
  static async validateBalance(transactions, reference) {
    const totalDebits = transactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
    const totalCredits = transactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0);
    const balanceDifference = Math.abs(totalDebits - totalCredits);
    
    if (balanceDifference > 0.01) {
      // Delete created transactions if unbalanced - use transaction for atomicity
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const transaction of transactions) {
            if (transaction._id) {
              await Transaction.findByIdAndDelete(transaction._id, { session });
            }
          }
        });
      } catch (deleteError) {
        console.error(`Failed to delete unbalanced transactions for ${reference}:`, deleteError);
        // Still throw the original balance error
      } finally {
        await session.endSession();
      }
      throw new Error(`Unbalanced transaction entries for ${reference}: Debits ${totalDebits.toFixed(2)} ≠ Credits ${totalCredits.toFixed(2)}`);
    }
    
    return { totalDebits, totalCredits };
  }

  /**
   * Create a single transaction entry
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  static async createTransaction(transactionData) {
    try {
      // Validate account code before creating transaction
      if (transactionData.accountCode) {
        await this.validateAccount(transactionData.accountCode);
      }
      
      const transaction = new Transaction(transactionData);
      await transaction.save();
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get account balance for a specific account code
   * @param {String} accountCode - Account code
   * @param {Date} asOfDate - Date to calculate balance as of
   * @returns {Promise<Number>} Account balance
   */
  static async getAccountBalance(accountCode, asOfDate = new Date()) {
    try {
      // Normalize account code to uppercase
      const normalizedAccountCode = accountCode ? accountCode.toString().trim().toUpperCase() : null;
      if (!normalizedAccountCode) {
        return 0;
      }

      // Get account to determine normal balance type
      const account = await ChartOfAccountsRepository.findOne({ 
        accountCode: normalizedAccountCode, 
        isActive: true 
      });
      
      if (!account) {
        console.warn(`Account ${normalizedAccountCode} not found or inactive`);
        return 0;
      }

      // Get opening balance
      let balance = account.openingBalance || 0;

      // Query transactions using createdAt (Transaction model doesn't have transactionDate field)
      const transactions = await Transaction.find({
        accountCode: normalizedAccountCode,
        createdAt: { $lte: asOfDate },
        status: 'completed'
      });

      // Calculate balance based on account type and normal balance
      // For debit normal balance accounts (assets, expenses): Debits increase, Credits decrease
      // For credit normal balance accounts (liabilities, equity, revenue): Credits increase, Debits decrease
      transactions.forEach(transaction => {
        const debit = transaction.debitAmount || 0;
        const credit = transaction.creditAmount || 0;
        
        if (account.normalBalance === 'credit') {
          // Credit normal balance: credits increase, debits decrease
          balance = balance + credit - debit;
        } else {
          // Debit normal balance: debits increase, credits decrease
          balance = balance + debit - credit;
        }
      });

      return balance;
    } catch (error) {
      console.error('Error calculating account balance:', error);
      throw error;
    }
  }

  /**
   * Get trial balance for all accounts
   * @param {Date} asOfDate - Date to calculate trial balance as of
   * @returns {Promise<Array>} Trial balance data
   */
  static async getTrialBalance(asOfDate = new Date()) {
    try {
      const accounts = await ChartOfAccountsRepository.findAll({ isActive: true });
      const trialBalance = [];

      for (const account of accounts) {
        const balance = await this.getAccountBalance(account.accountCode, asOfDate);
        if (balance !== 0) {
          trialBalance.push({
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
            debitBalance: balance > 0 ? balance : 0,
            creditBalance: balance < 0 ? Math.abs(balance) : 0
          });
        }
      }

      return trialBalance;
    } catch (error) {
      console.error('Error generating trial balance:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for sales orders
   * @param {Object} order - Sales order data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordSale(order) {
    try {
      const transactions = [];
      const orderTotal = order.pricing?.total;
      if (orderTotal === undefined || orderTotal === null) {
        throw new Error(`Order ${order._id || order.orderNumber} missing required pricing.total`);
      }
      const amountPaid = order.payment?.amountPaid || 0;
      const unpaidAmount = orderTotal - amountPaid;
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Handle payment method and partial payments
      // For partial payments, debit both Cash and AR
      if (amountPaid > 0) {
        // Debit Cash for amount paid (even if partial)
        const cashTransaction = await this.createTransaction({
          transactionId: `SO-CASH-${order._id}`,
          orderId: order._id,
          paymentId: order._id,
          paymentMethod: order.payment.method || 'cash',
          type: 'sale',
          amount: amountPaid,
          currency: 'USD',
          status: 'completed',
          description: `Sale Payment: ${order.orderNumber}${unpaidAmount > 0 ? ` (Partial: $${amountPaid})` : ''}`,
          accountCode: accountCodes.cash,
          debitAmount: amountPaid,
          creditAmount: 0,
          reference: order.orderNumber,
          customer: order.customer,
          createdBy: order.createdBy
        });
        transactions.push(cashTransaction);
      }
      
      // Debit AR for unpaid amount (if any)
      if (unpaidAmount > 0) {
        const arTransaction = await this.createTransaction({
          transactionId: `SO-AR-${order._id}`,
          orderId: order._id,
          paymentId: order._id,
          paymentMethod: order.payment.method || 'account',
          type: 'sale',
          amount: unpaidAmount,
          currency: 'USD',
          status: 'completed',
          description: `Credit Sale: ${order.orderNumber}${amountPaid > 0 ? ` (Unpaid: $${unpaidAmount})` : ''}`,
          accountCode: accountCodes.accountsReceivable,
          debitAmount: unpaidAmount,
          creditAmount: 0,
          reference: order.orderNumber,
          customer: order.customer,
          createdBy: order.createdBy
        });
        transactions.push(arTransaction);
      }

      // Credit: Sales Revenue (full order amount)
      const revenueTransaction = await this.createTransaction({
        transactionId: `SO-REV-${order._id}`,
        orderId: order._id,
        paymentId: order._id,
        paymentMethod: order.payment.method || 'cash',
        type: 'sale',
        amount: orderTotal,
        currency: 'USD',
        status: 'completed',
        description: `Sales Revenue: ${order.orderNumber}`,
        accountCode: accountCodes.salesRevenue,
        debitAmount: 0,
        creditAmount: orderTotal,
        reference: order.orderNumber,
        customer: order.customer,
        createdBy: order.createdBy
      });
      transactions.push(revenueTransaction);

      // Debit: Cost of Goods Sold (COGS)
      let totalCOGS = 0;
      const Product = require('../models/Product');
      
      // Collect all product IDs to avoid N+1 queries
      const productIds = order.items
        ? order.items.map(item => item.product).filter(Boolean)
        : [];
      
      // Fetch all products in one batch query
      const products = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } })
        : [];
      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      
      // Calculate COGS using pre-fetched products
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.product) {
            const product = productMap.get(item.product.toString());
            if (product) {
              const productCost = product.pricing?.cost;
            if (productCost === undefined || productCost === null) {
              console.warn(`Product ${product._id} missing pricing.cost for order ${order.orderNumber}`);
            }
            const cost = productCost || 0;
              totalCOGS += item.quantity * cost;
            }
          }
        }
      }

      if (totalCOGS > 0) {
        const cogsTransaction = await this.createTransaction({
          transactionId: `SO-COGS-${order._id}`,
          orderId: order._id,
          paymentId: order._id,
          paymentMethod: order.payment.method || 'cash',
          type: 'sale',
          amount: totalCOGS,
          currency: 'USD',
          status: 'completed',
          description: `Cost of Goods Sold: ${order.orderNumber}`,
          accountCode: accountCodes.costOfGoodsSold,
          debitAmount: totalCOGS,
          creditAmount: 0,
          reference: order.orderNumber,
          customer: order.customer,
          createdBy: order.createdBy
        });
        transactions.push(cogsTransaction);

        // Credit: Inventory (reduce inventory value)
        const inventoryTransaction = await this.createTransaction({
          transactionId: `SO-INV-${order._id}`,
          orderId: order._id,
          paymentId: order._id,
          paymentMethod: order.payment.method || 'cash',
          type: 'sale',
          amount: totalCOGS,
          currency: 'USD',
          status: 'completed',
          description: `Inventory Reduction: ${order.orderNumber}`,
          accountCode: accountCodes.inventory,
          debitAmount: 0,
          creditAmount: totalCOGS,
          reference: order.orderNumber,
          customer: order.customer,
          createdBy: order.createdBy
        });
        transactions.push(inventoryTransaction);
      }

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `sales order ${order.orderNumber}`);

      console.log(`Created ${transactions.length} accounting entries for sales order ${order.orderNumber} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for sales order:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for purchase orders (when confirmed)
   * @param {Object} purchaseOrder - Purchase order data
   * @returns {Promise<Array>} Created transactions
   */
  static async recordPurchase(purchaseOrder) {
    try {
      const transactions = [];
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Validate purchase order has pricing.total
      const purchaseTotal = purchaseOrder.pricing?.total;
      if (purchaseTotal === undefined || purchaseTotal === null) {
        throw new Error(`Purchase order ${purchaseOrder._id || purchaseOrder.poNumber} missing required pricing.total`);
      }
      
      // Debit: Inventory (increase inventory value)
      const inventoryTransaction = await this.createTransaction({
        transactionId: `PO-INV-${purchaseOrder._id}`,
        orderId: purchaseOrder._id,
        paymentId: purchaseOrder._id,
        paymentMethod: 'account',
        type: 'sale',
        amount: purchaseTotal,
        currency: 'USD',
        status: 'completed',
        description: `Inventory Purchase: ${purchaseOrder.poNumber}`,
        accountCode: accountCodes.inventory,
        debitAmount: purchaseTotal,
        creditAmount: 0,
        reference: purchaseOrder.poNumber,
        supplier: purchaseOrder.supplier,
        createdBy: purchaseOrder.createdBy
      });
      transactions.push(inventoryTransaction);

      // Credit: Accounts Payable
      const apTransaction = await this.createTransaction({
        transactionId: `PO-AP-${purchaseOrder._id}`,
        orderId: purchaseOrder._id,
        paymentId: purchaseOrder._id,
        paymentMethod: 'account',
        type: 'sale',
        amount: purchaseTotal,
        currency: 'USD',
        status: 'completed',
        description: `Purchase on Credit: ${purchaseOrder.poNumber}`,
        accountCode: accountCodes.accountsPayable,
        debitAmount: 0,
        creditAmount: purchaseTotal,
        reference: purchaseOrder.poNumber,
        supplier: purchaseOrder.supplier,
        createdBy: purchaseOrder.createdBy
      });
      transactions.push(apTransaction);

      // Validate double-entry balance
      const balance = await this.validateBalance(transactions, `purchase order ${purchaseOrder.poNumber}`);

      console.log(`Created ${transactions.length} accounting entries for purchase order ${purchaseOrder.poNumber} (Debits: ${balance.totalDebits.toFixed(2)} = Credits: ${balance.totalCredits.toFixed(2)})`);
      return transactions;
    } catch (error) {
      console.error('Error creating accounting entries for purchase order:', error);
      throw error;
    }
  }

  /**
   * Update balance sheet with current account balances
   * @param {Date} statementDate - Statement date
   * @returns {Promise<Object>} Updated balance sheet
   */
  static async updateBalanceSheet(statementDate = new Date()) {
    try {
      // Get account codes dynamically instead of hardcoding
      const accountCodes = await this.getDefaultAccountCodes();
      
      // Get current balances for key accounts using dynamic account codes
      const cashBalance = await this.getAccountBalance(accountCodes.cash, statementDate);
      const bankBalance = await this.getAccountBalance(accountCodes.bank, statementDate);
      const accountsReceivable = await this.getAccountBalance(accountCodes.accountsReceivable, statementDate);
      const inventoryBalance = await this.getAccountBalance(accountCodes.inventory, statementDate);
      const accountsPayable = await this.getAccountBalance(accountCodes.accountsPayable, statementDate);

      // Create or update balance sheet
      const statementNumber = `BS-${statementDate.getFullYear()}-${String(statementDate.getMonth() + 1).padStart(2, '0')}`;
      
      const balanceSheetData = {
        statementNumber,
        statementDate,
        periodType: 'monthly',
        status: 'draft',
        assets: {
          currentAssets: {
            cashAndCashEquivalents: {
              cashOnHand: cashBalance,
              bankAccounts: bankBalance,
              pettyCash: 0,
              total: cashBalance + bankBalance
            },
            accountsReceivable: {
              tradeReceivables: accountsReceivable,
              otherReceivables: 0,
              allowanceForDoubtfulAccounts: 0,
              netReceivables: accountsReceivable
            },
            inventory: {
              rawMaterials: 0,
              workInProgress: 0,
              finishedGoods: inventoryBalance,
              total: inventoryBalance
            },
            prepaidExpenses: 0,
            otherCurrentAssets: 0,
            totalCurrentAssets: cashBalance + bankBalance + accountsReceivable + inventoryBalance
          }
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable: {
              tradePayables: accountsPayable,
              otherPayables: 0,
              total: accountsPayable
            },
            accruedExpenses: 0,
            shortTermDebt: 0,
            otherCurrentLiabilities: 0,
            totalCurrentLiabilities: accountsPayable
          }
        }
      };

      // Calculate totals
      balanceSheetData.assets.totalAssets = balanceSheetData.assets.currentAssets.totalCurrentAssets;
      balanceSheetData.liabilities.totalLiabilities = balanceSheetData.liabilities.currentLiabilities.totalCurrentLiabilities;
      balanceSheetData.equity = {
        ownerEquity: balanceSheetData.assets.totalAssets - balanceSheetData.liabilities.totalLiabilities,
        retainedEarnings: 0,
        totalEquity: balanceSheetData.assets.totalAssets - balanceSheetData.liabilities.totalLiabilities
      };
      balanceSheetData.totalLiabilitiesAndEquity = balanceSheetData.liabilities.totalLiabilities + balanceSheetData.equity.totalEquity;

      // Save or update balance sheet
      const balanceSheet = await BalanceSheet.findOneAndUpdate(
        { statementNumber },
        balanceSheetData,
        { upsert: true, new: true }
      );

      console.log(`Updated balance sheet ${statementNumber} with current balances`);
      return balanceSheet;
    } catch (error) {
      console.error('Error updating balance sheet:', error);
      throw error;
    }
  }
}

module.exports = AccountingService;
