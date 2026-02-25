#![no_std]
#![allow(dead_code)]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, Symbol,
    Vec,
};

// ============================================================================
// Error Codes
// ============================================================================

/// Contract error codes for the Treasury module.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract has not been initialized yet.
    NotInitialized = 1,
    /// Contract is already initialized.
    AlreadyInitialized = 2,
    /// Caller is not authorized for this operation.
    Unauthorized = 3,
    /// Deposit amount must be greater than zero.
    InvalidAmount = 4,
    /// Treasury does not have enough funds to process withdrawal.
    InsufficientFunds = 5,
    /// The provided threshold is invalid (must be > 0 and <= signer count).
    InvalidThreshold = 6,
    /// Transaction proposal was not found.
    TransactionNotFound = 7,
    /// Signer has already approved this transaction.
    AlreadyApproved = 8,
    /// Transaction has already been executed.
    AlreadyExecuted = 9,
    /// Address is already a signer.
    AlreadySigner = 10,
    /// Address is not a signer.
    NotASigner = 11,
    /// Cannot remove signer — would breach threshold.
    ThresholdBreach = 12,
}

// ============================================================================
// Storage Types
// ============================================================================

/// Keys for contract storage.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// The admin address that initialized the contract.
    Admin,
    /// The approval threshold for multi-sig.
    Threshold,
    /// List of authorized signers.
    Signers,
    /// Native balance held in treasury.
    Balance,
    /// Transaction proposal by ID.
    Transaction(u64),
    /// Counter for transaction IDs.
    TxCounter,
    /// Whether the contract is initialized.
    Initialized,
}

/// A pending transaction proposal in the multi-sig treasury.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transaction {
    /// Unique identifier.
    pub id: u64,
    /// Destination address for the withdrawal.
    pub to: Address,
    /// Amount to withdraw (in stroops).
    pub amount: i128,
    /// Text description / memo for the transaction.
    pub memo: Symbol,
    /// Addresses that have approved this transaction.
    pub approvals: Vec<Address>,
    /// Whether the transaction has been executed.
    pub executed: bool,
    /// Timestamp when the transaction was proposed.
    pub created_at: u64,
    /// Address that proposed the transaction.
    pub proposer: Address,
}

/// Treasury configuration data.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryConfig {
    /// Admin address.
    pub admin: Address,
    /// Required approval threshold.
    pub threshold: u32,
    /// Number of signers.
    pub signer_count: u32,
    /// Current balance (in stroops).
    pub balance: i128,
    /// Total transactions proposed.
    pub tx_count: u64,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    // ========================================================================
    // Initialization
    // ========================================================================

    /// Initialize the treasury contract with an admin and approval threshold.
    ///
    /// # Arguments
    /// * `env` - The contract environment.
    /// * `admin` - The address that will administer the treasury.
    /// * `threshold` - The number of approvals required for withdrawals.
    /// * `signers` - Initial list of authorized signers.
    ///
    /// # Errors
    /// * `Error::AlreadyInitialized` - If the contract was already initialized.
    /// * `Error::InvalidThreshold` - If threshold is 0 or exceeds signer count.
    pub fn initialize(
        env: Env,
        admin: Address,
        threshold: u32,
        signers: Vec<Address>,
    ) -> Result<(), Error> {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        // Validate threshold
        let signer_count = signers.len();
        if threshold == 0 || threshold > signer_count {
            return Err(Error::InvalidThreshold);
        }

        admin.require_auth();

        // Store all initial state
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage().instance().set(&DataKey::Balance, &0_i128);
        env.storage().instance().set(&DataKey::TxCounter, &0_u64);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("init")),
            (admin.clone(), threshold, signer_count),
        );

        log!(
            &env,
            "Treasury initialized with {} signers, threshold {}",
            signer_count,
            threshold
        );
        Ok(())
    }

    // ========================================================================
    // Deposits
    // ========================================================================

    /// Deposit funds into the treasury.
    ///
    /// # Arguments
    /// * `env` - The contract environment.
    /// * `from` - The address depositing funds.
    /// * `amount` - The amount to deposit (in stroops).
    ///
    /// # Errors
    /// * `Error::NotInitialized` - If the contract is not initialized.
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        from.require_auth();

        // Update balance
        let current_balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        let new_balance = current_balance + amount;
        env.storage()
            .instance()
            .set(&DataKey::Balance, &new_balance);

        // Emit deposit event
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("deposit")),
            (from.clone(), amount, new_balance),
        );

        log!(
            &env,
            "Deposit of {} from {:?}, new balance: {}",
            amount,
            from,
            new_balance
        );
        Ok(())
    }

    // ========================================================================
    // Withdrawal Proposals
    // ========================================================================

    /// Propose a withdrawal from the treasury.
    /// Only authorized signers can propose withdrawals.
    ///
    /// # Arguments
    /// * `env` - The contract environment.
    /// * `proposer` - The signer proposing the withdrawal.
    /// * `to` - The destination address.
    /// * `amount` - The amount to withdraw.
    /// * `memo` - A short description of the withdrawal.
    ///
    /// # Returns
    /// The ID of the created transaction proposal.
    ///
    /// # Errors
    /// * `Error::NotInitialized` - If the contract is not initialized.
    /// * `Error::NotASigner` - If the proposer is not an authorized signer.
    /// * `Error::InvalidAmount` - If the amount is zero or negative.
    /// * `Error::InsufficientFunds` - If treasury balance is less than amount.
    pub fn propose_withdrawal(
        env: Env,
        proposer: Address,
        to: Address,
        amount: i128,
        memo: Symbol,
    ) -> Result<u64, Error> {
        Self::require_initialized(&env)?;
        Self::require_signer(&env, &proposer)?;

        proposer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Check sufficient balance
        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        if balance < amount {
            return Err(Error::InsufficientFunds);
        }

        // Get and increment counter
        let tx_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TxCounter)
            .unwrap_or(0);
        let next_id = tx_id + 1;
        env.storage().instance().set(&DataKey::TxCounter, &next_id);

        // Create initial approval list with proposer
        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        // Build transaction proposal
        let transaction = Transaction {
            id: next_id,
            to: to.clone(),
            amount,
            memo: memo.clone(),
            approvals,
            executed: false,
            created_at: env.ledger().timestamp(),
            proposer: proposer.clone(),
        };

        // Store transaction
        env.storage()
            .persistent()
            .set(&DataKey::Transaction(next_id), &transaction);

        // Emit proposal event
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("propose")),
            (next_id, proposer.clone(), to, amount),
        );

        log!(
            &env,
            "Withdrawal proposal #{} created by {:?} for {}",
            next_id,
            proposer,
            amount
        );
        Ok(next_id)
    }

    // ========================================================================
    // Multi-Sig Approval
    // ========================================================================

    /// Approve a pending withdrawal transaction.
    /// Once the threshold is reached, the transaction can be executed.
    ///
    /// # Arguments
    /// * `env` - The contract environment.
    /// * `signer` - The signer approving the transaction.
    /// * `tx_id` - The ID of the transaction to approve.
    ///
    /// # Errors
    /// * `Error::NotASigner` - If the caller is not a signer.
    /// * `Error::TransactionNotFound` - If the transaction doesn't exist.
    /// * `Error::AlreadyApproved` - If signer already approved.
    /// * `Error::AlreadyExecuted` - If transaction is already executed.
    pub fn approve(env: Env, signer: Address, tx_id: u64) -> Result<u32, Error> {
        Self::require_initialized(&env)?;
        Self::require_signer(&env, &signer)?;

        signer.require_auth();

        // Load transaction
        let mut transaction: Transaction = env
            .storage()
            .persistent()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)?;

        if transaction.executed {
            return Err(Error::AlreadyExecuted);
        }

        // Check if already approved by this signer
        for i in 0..transaction.approvals.len() {
            if transaction.approvals.get(i).unwrap() == signer {
                return Err(Error::AlreadyApproved);
            }
        }

        // Add approval
        transaction.approvals.push_back(signer.clone());
        let approval_count = transaction.approvals.len();

        // Save updated transaction
        env.storage()
            .persistent()
            .set(&DataKey::Transaction(tx_id), &transaction);

        // Emit approval event
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("approve")),
            (tx_id, signer.clone(), approval_count),
        );

        log!(
            &env,
            "Transaction #{} approved by {:?} ({} approvals)",
            tx_id,
            signer,
            approval_count
        );
        Ok(approval_count)
    }

    /// Execute a fully approved withdrawal transaction.
    /// Requires the approval count to meet or exceed the threshold.
    ///
    /// # Arguments
    /// * `env` - The contract environment.
    /// * `executor` - The signer executing the transaction.
    /// * `tx_id` - The ID of the transaction to execute.
    ///
    /// # Errors
    /// * `Error::NotASigner` - If executor is not a signer.
    /// * `Error::TransactionNotFound` - If the transaction doesn't exist.
    /// * `Error::AlreadyExecuted` - If already executed.
    /// * `Error::Unauthorized` - If approval threshold not met.
    pub fn execute(env: Env, executor: Address, tx_id: u64) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_signer(&env, &executor)?;

        executor.require_auth();

        let mut transaction: Transaction = env
            .storage()
            .persistent()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)?;

        if transaction.executed {
            return Err(Error::AlreadyExecuted);
        }

        // Check threshold
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        if transaction.approvals.len() < threshold {
            return Err(Error::Unauthorized);
        }

        // Deduct balance
        let current_balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        if current_balance < transaction.amount {
            return Err(Error::InsufficientFunds);
        }
        let new_balance = current_balance - transaction.amount;
        env.storage()
            .instance()
            .set(&DataKey::Balance, &new_balance);

        // Mark as executed
        transaction.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Transaction(tx_id), &transaction);

        // Emit execution event
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("execute")),
            (
                tx_id,
                transaction.to.clone(),
                transaction.amount,
                new_balance,
            ),
        );

        log!(
            &env,
            "Transaction #{} executed: {} to {:?}",
            tx_id,
            transaction.amount,
            transaction.to
        );
        Ok(())
    }

    // ========================================================================
    // Signer Management
    // ========================================================================

    /// Add a new signer to the multi-sig treasury.
    /// Only the admin can add signers.
    pub fn add_signer(env: Env, admin: Address, new_signer: Address) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;

        admin.require_auth();

        let mut signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(&env));

        // Check if already a signer
        for i in 0..signers.len() {
            if signers.get(i).unwrap() == new_signer {
                return Err(Error::AlreadySigner);
            }
        }

        signers.push_back(new_signer.clone());
        env.storage().instance().set(&DataKey::Signers, &signers);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("add_sig")),
            (new_signer.clone(), signers.len()),
        );

        Ok(())
    }

    /// Remove a signer from the multi-sig treasury.
    /// Only the admin can remove signers. Cannot reduce below threshold.
    pub fn remove_signer(env: Env, admin: Address, signer: Address) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;

        admin.require_auth();

        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(&env));

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);

        // Cannot remove if it would breach threshold
        if signers.len() <= threshold {
            return Err(Error::ThresholdBreach);
        }

        // Find and remove the signer
        let mut new_signers = Vec::new(&env);
        let mut found = false;
        for i in 0..signers.len() {
            let s = signers.get(i).unwrap();
            if s == signer {
                found = true;
            } else {
                new_signers.push_back(s);
            }
        }

        if !found {
            return Err(Error::NotASigner);
        }

        env.storage()
            .instance()
            .set(&DataKey::Signers, &new_signers);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("rem_sig")),
            (signer.clone(), new_signers.len()),
        );

        Ok(())
    }

    /// Update the approval threshold.
    /// Only the admin can change the threshold.
    pub fn set_threshold(env: Env, admin: Address, new_threshold: u32) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;

        admin.require_auth();

        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(&env));

        if new_threshold == 0 || new_threshold > signers.len() {
            return Err(Error::InvalidThreshold);
        }

        env.storage()
            .instance()
            .set(&DataKey::Threshold, &new_threshold);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("thresh")),
            new_threshold,
        );

        Ok(())
    }

    // ========================================================================
    // Query Functions
    // ========================================================================

    /// Get the current treasury balance.
    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    /// Get the treasury configuration.
    pub fn get_config(env: Env) -> Result<TreasuryConfig, Error> {
        Self::require_initialized(&env)?;

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .unwrap_or(1);
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(&env));
        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        let tx_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TxCounter)
            .unwrap_or(0);

        Ok(TreasuryConfig {
            admin,
            threshold,
            signer_count: signers.len(),
            balance,
            tx_count,
        })
    }

    /// Get a specific transaction by ID.
    pub fn get_transaction(env: Env, tx_id: u64) -> Result<Transaction, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)
    }

    /// Get the list of current signers.
    pub fn get_signers(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(&env))
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /// Transfer admin role to a new address.
    pub fn transfer_admin(
        env: Env,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &current_admin)?;

        current_admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("admin")),
            (current_admin, new_admin.clone()),
        );

        Ok(())
    }

    /// Upgrade the contract WASM. Admin only.
    pub fn upgrade(
        env: Env,
        admin: Address,
        new_wasm_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;

        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    // ========================================================================
    // Internal Helpers
    // ========================================================================

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if *caller != admin {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn require_signer(env: &Env, caller: &Address) -> Result<(), Error> {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(Vec::new(env));

        for i in 0..signers.len() {
            if signers.get(i).unwrap() == *caller {
                return Ok(());
            }
        }
        Err(Error::NotASigner)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    fn setup_contract() -> (Env, Address, TreasuryContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TreasuryContract, ());
        let client = TreasuryContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (env, admin, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signer3 = Address::generate(&env);

        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone(), signer3.clone()]);

        client.initialize(&admin, &2, &signers);

        let config = client.get_config();
        assert_eq!(config.admin, admin);
        assert_eq!(config.threshold, 2);
        assert_eq!(config.signer_count, 3);
        assert_eq!(config.balance, 0);
    }

    #[test]
    fn test_deposit() {
        let (env, admin, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);
        client.initialize(&admin, &1, &signers);

        let depositor = Address::generate(&env);
        client.deposit(&depositor, &1_000_000);

        assert_eq!(client.get_balance(), 1_000_000);
    }

    #[test]
    fn test_propose_and_approve() {
        let (env, admin, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);
        client.initialize(&admin, &2, &signers);

        // Deposit some funds
        client.deposit(&signer1, &5_000_000);

        // Propose withdrawal
        let recipient = Address::generate(&env);
        let tx_id =
            client.propose_withdrawal(&signer1, &recipient, &1_000_000, &symbol_short!("rent"));
        assert_eq!(tx_id, 1);

        // Second signer approves
        let approval_count = client.approve(&signer2, &tx_id);
        assert_eq!(approval_count, 2);

        // Execute
        client.execute(&signer1, &tx_id);

        // Check balance deducted
        assert_eq!(client.get_balance(), 4_000_000);

        // Check transaction marked as executed
        let tx = client.get_transaction(&tx_id);
        assert_eq!(tx.executed, true);
    }
}
