#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, Symbol,
    Vec,
};

// ============================================================================
// Error Codes
// ============================================================================

/// Contract error codes for the Token Vault module.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract has not been initialized.
    NotInitialized = 1,
    /// Contract is already initialized.
    AlreadyInitialized = 2,
    /// Caller does not have permission.
    Unauthorized = 3,
    /// Lock amount must be greater than zero.
    InvalidAmount = 4,
    /// Invalid lock duration.
    InvalidDuration = 5,
    /// Lock entry not found.
    LockNotFound = 6,
    /// Lock is still active (not yet unlockable).
    LockStillActive = 7,
    /// Lock has already been claimed.
    AlreadyClaimed = 8,
    /// Emergency unlock not approved by enough signers.
    EmergencyNotApproved = 9,
    /// Vesting schedule not found.
    VestingNotFound = 10,
    /// No tokens available to claim yet.
    NothingToClaim = 11,
    /// Signer already approved emergency unlock.
    AlreadyApprovedEmergency = 12,
}

// ============================================================================
// Storage Types
// ============================================================================

/// Storage keys for the token vault contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Admin address.
    Admin,
    /// Whether contract is initialized.
    Initialized,
    /// Emergency unlock approvers.
    EmergencySigners,
    /// Emergency unlock threshold.
    EmergencyThreshold,
    /// Lock counter.
    LockCounter,
    /// A token lock entry by ID.
    Lock(u64),
    /// Emergency approvals for a lock ID.
    EmergencyApprovals(u64),
    /// Vesting counter.
    VestingCounter,
    /// A vesting schedule by ID.
    Vesting(u64),
    /// Total locked amount.
    TotalLocked,
}

/// A token lock entry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenLock {
    /// Unique identifier.
    pub id: u64,
    /// Address that locked the tokens.
    pub owner: Address,
    /// Amount locked (in stroops).
    pub amount: i128,
    /// Timestamp when the lock was created.
    pub locked_at: u64,
    /// Timestamp when tokens can be unlocked.
    pub unlock_at: u64,
    /// Whether the lock has been claimed/released.
    pub claimed: bool,
    /// Description of the lock purpose.
    pub memo: Symbol,
}

/// A vesting schedule entry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VestingSchedule {
    /// Unique identifier.
    pub id: u64,
    /// Beneficiary address.
    pub beneficiary: Address,
    /// Total amount to vest.
    pub total_amount: i128,
    /// Amount already claimed.
    pub claimed_amount: i128,
    /// Timestamp when vesting starts.
    pub start_time: u64,
    /// Total vesting duration in seconds.
    pub duration: u64,
    /// Cliff duration in seconds (no vesting before cliff).
    pub cliff: u64,
    /// Description.
    pub memo: Symbol,
}

/// Vault statistics.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultStats {
    pub total_locked: i128,
    pub lock_count: u64,
    pub vesting_count: u64,
    pub admin: Address,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct TokenVaultContract;

#[contractimpl]
impl TokenVaultContract {
    // ========================================================================
    // Initialization
    // ========================================================================

    /// Initialize the token vault contract.
    ///
    /// # Arguments
    /// * `admin` - The admin address.
    /// * `emergency_signers` - Addresses that can approve emergency unlocks.
    /// * `emergency_threshold` - Number of approvals needed for emergency unlock.
    pub fn initialize(
        env: Env,
        admin: Address,
        emergency_signers: Vec<Address>,
        emergency_threshold: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::EmergencySigners, &emergency_signers);
        env.storage()
            .instance()
            .set(&DataKey::EmergencyThreshold, &emergency_threshold);
        env.storage().instance().set(&DataKey::LockCounter, &0_u64);
        env.storage()
            .instance()
            .set(&DataKey::VestingCounter, &0_u64);
        env.storage().instance().set(&DataKey::TotalLocked, &0_i128);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("init")),
            (admin.clone(), emergency_signers.len()),
        );

        log!(&env, "Token vault initialized");
        Ok(())
    }

    // ========================================================================
    // Token Locking
    // ========================================================================

    /// Lock tokens for a specified duration.
    ///
    /// # Arguments
    /// * `owner` - The address locking the tokens.
    /// * `amount` - The amount to lock.
    /// * `duration` - Lock duration in seconds.
    /// * `memo` - Description of the lock.
    pub fn lock_tokens(
        env: Env,
        owner: Address,
        amount: i128,
        duration: u64,
        memo: Symbol,
    ) -> Result<u64, Error> {
        Self::require_initialized(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if duration == 0 {
            return Err(Error::InvalidDuration);
        }

        owner.require_auth();

        // Get and increment lock counter
        let lock_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::LockCounter)
            .unwrap_or(0)
            + 1;
        env.storage()
            .instance()
            .set(&DataKey::LockCounter, &lock_id);

        let now = env.ledger().timestamp();
        let lock = TokenLock {
            id: lock_id,
            owner: owner.clone(),
            amount,
            locked_at: now,
            unlock_at: now + duration,
            claimed: false,
            memo: memo.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Lock(lock_id), &lock);

        // Update total locked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalLocked, &(total + amount));

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("lock")),
            (lock_id, owner.clone(), amount, duration),
        );

        log!(
            &env,
            "Tokens locked: {} for {} seconds (lock #{})",
            amount,
            duration,
            lock_id
        );
        Ok(lock_id)
    }

    /// Claim/unlock tokens after the lock period has expired.
    ///
    /// # Arguments
    /// * `owner` - Must be the lock owner.
    /// * `lock_id` - The ID of the lock to claim.
    pub fn claim(env: Env, owner: Address, lock_id: u64) -> Result<i128, Error> {
        Self::require_initialized(&env)?;

        owner.require_auth();

        let mut lock: TokenLock = env
            .storage()
            .persistent()
            .get(&DataKey::Lock(lock_id))
            .ok_or(Error::LockNotFound)?;

        if lock.owner != owner {
            return Err(Error::Unauthorized);
        }

        if lock.claimed {
            return Err(Error::AlreadyClaimed);
        }

        let now = env.ledger().timestamp();
        if now < lock.unlock_at {
            return Err(Error::LockStillActive);
        }

        lock.claimed = true;
        let amount = lock.amount;

        env.storage()
            .persistent()
            .set(&DataKey::Lock(lock_id), &lock);

        // Update total locked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        let new_total = if total > amount { total - amount } else { 0 };
        env.storage()
            .instance()
            .set(&DataKey::TotalLocked, &new_total);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("claim")),
            (lock_id, owner.clone(), amount),
        );

        log!(
            &env,
            "Lock #{} claimed by {:?}: {} tokens",
            lock_id,
            owner,
            amount
        );
        Ok(amount)
    }

    // ========================================================================
    // Emergency Unlock (Multi-Sig)
    // ========================================================================

    /// Approve an emergency unlock for a specific lock.
    /// Requires multi-sig from emergency signers.
    pub fn approve_emergency(env: Env, signer: Address, lock_id: u64) -> Result<u32, Error> {
        Self::require_initialized(&env)?;

        signer.require_auth();

        // Verify signer is an emergency signer
        let emergency_signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::EmergencySigners)
            .unwrap_or(Vec::new(&env));

        let mut is_emergency_signer = false;
        for i in 0..emergency_signers.len() {
            if emergency_signers.get(i).unwrap() == signer {
                is_emergency_signer = true;
                break;
            }
        }
        if !is_emergency_signer {
            return Err(Error::Unauthorized);
        }

        // Check lock exists and isn't claimed
        let lock: TokenLock = env
            .storage()
            .persistent()
            .get(&DataKey::Lock(lock_id))
            .ok_or(Error::LockNotFound)?;

        if lock.claimed {
            return Err(Error::AlreadyClaimed);
        }

        // Get current approvals
        let mut approvals: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::EmergencyApprovals(lock_id))
            .unwrap_or(Vec::new(&env));

        // Check not already approved
        for i in 0..approvals.len() {
            if approvals.get(i).unwrap() == signer {
                return Err(Error::AlreadyApprovedEmergency);
            }
        }

        approvals.push_back(signer.clone());
        let count = approvals.len();
        env.storage()
            .persistent()
            .set(&DataKey::EmergencyApprovals(lock_id), &approvals);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("emrg_ap")),
            (lock_id, signer.clone(), count),
        );

        Ok(count)
    }

    /// Execute emergency unlock after enough approvals.
    pub fn emergency_unlock(env: Env, caller: Address, lock_id: u64) -> Result<i128, Error> {
        Self::require_initialized(&env)?;

        caller.require_auth();

        let mut lock: TokenLock = env
            .storage()
            .persistent()
            .get(&DataKey::Lock(lock_id))
            .ok_or(Error::LockNotFound)?;

        if lock.claimed {
            return Err(Error::AlreadyClaimed);
        }

        // Check approvals meet threshold
        let approvals: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::EmergencyApprovals(lock_id))
            .unwrap_or(Vec::new(&env));

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EmergencyThreshold)
            .unwrap_or(2);

        if approvals.len() < threshold {
            return Err(Error::EmergencyNotApproved);
        }

        // Release lock
        lock.claimed = true;
        let amount = lock.amount;
        env.storage()
            .persistent()
            .set(&DataKey::Lock(lock_id), &lock);

        // Update total locked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        let new_total = if total > amount { total - amount } else { 0 };
        env.storage()
            .instance()
            .set(&DataKey::TotalLocked, &new_total);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("emrg_ex")),
            (lock_id, caller.clone(), amount),
        );

        Ok(amount)
    }

    // ========================================================================
    // Vesting Schedules
    // ========================================================================

    /// Create a vesting schedule for a beneficiary.
    ///
    /// # Arguments
    /// * `admin` - Only admin can create vesting schedules.
    /// * `beneficiary` - The address that will receive vested tokens.
    /// * `total_amount` - Total amount to vest.
    /// * `duration` - Total vesting duration in seconds.
    /// * `cliff` - Cliff period in seconds.
    /// * `memo` - Description.
    pub fn create_vesting(
        env: Env,
        admin: Address,
        beneficiary: Address,
        total_amount: i128,
        duration: u64,
        cliff: u64,
        memo: Symbol,
    ) -> Result<u64, Error> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;

        admin.require_auth();

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if duration == 0 {
            return Err(Error::InvalidDuration);
        }

        let vesting_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VestingCounter)
            .unwrap_or(0)
            + 1;
        env.storage()
            .instance()
            .set(&DataKey::VestingCounter, &vesting_id);

        let now = env.ledger().timestamp();
        let schedule = VestingSchedule {
            id: vesting_id,
            beneficiary: beneficiary.clone(),
            total_amount,
            claimed_amount: 0,
            start_time: now,
            duration,
            cliff,
            memo: memo.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Vesting(vesting_id), &schedule);

        // Update total locked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalLocked, &(total + total_amount));

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("vest")),
            (vesting_id, beneficiary.clone(), total_amount, duration),
        );

        log!(
            &env,
            "Vesting #{} created for {:?}: {} over {} seconds",
            vesting_id,
            beneficiary,
            total_amount,
            duration
        );
        Ok(vesting_id)
    }

    /// Claim available vested tokens.
    pub fn claim_vested(env: Env, beneficiary: Address, vesting_id: u64) -> Result<i128, Error> {
        Self::require_initialized(&env)?;

        beneficiary.require_auth();

        let mut schedule: VestingSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Vesting(vesting_id))
            .ok_or(Error::VestingNotFound)?;

        if schedule.beneficiary != beneficiary {
            return Err(Error::Unauthorized);
        }

        let now = env.ledger().timestamp();

        // Check cliff
        if now < schedule.start_time + schedule.cliff {
            return Err(Error::NothingToClaim);
        }

        // Calculate vested amount
        let elapsed = now - schedule.start_time;
        let vested = if elapsed >= schedule.duration {
            schedule.total_amount
        } else {
            (schedule.total_amount * elapsed as i128) / schedule.duration as i128
        };

        let claimable = vested - schedule.claimed_amount;
        if claimable <= 0 {
            return Err(Error::NothingToClaim);
        }

        schedule.claimed_amount += claimable;
        env.storage()
            .persistent()
            .set(&DataKey::Vesting(vesting_id), &schedule);

        // Update total locked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        let new_total = if total > claimable {
            total - claimable
        } else {
            0
        };
        env.storage()
            .instance()
            .set(&DataKey::TotalLocked, &new_total);

        env.events().publish(
            (symbol_short!("vault"), symbol_short!("v_claim")),
            (vesting_id, beneficiary.clone(), claimable),
        );

        Ok(claimable)
    }

    // ========================================================================
    // Query Functions
    // ========================================================================

    /// Get a lock entry by ID.
    pub fn get_lock(env: Env, lock_id: u64) -> Result<TokenLock, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Lock(lock_id))
            .ok_or(Error::LockNotFound)
    }

    /// Get a vesting schedule by ID.
    pub fn get_vesting(env: Env, vesting_id: u64) -> Result<VestingSchedule, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Vesting(vesting_id))
            .ok_or(Error::VestingNotFound)
    }

    /// Get vault statistics.
    pub fn get_stats(env: Env) -> Result<VaultStats, Error> {
        Self::require_initialized(&env)?;

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        let total_locked: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalLocked)
            .unwrap_or(0);
        let lock_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::LockCounter)
            .unwrap_or(0);
        let vesting_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VestingCounter)
            .unwrap_or(0);

        Ok(VaultStats {
            total_locked,
            lock_count,
            vesting_count,
            admin,
        })
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /// Transfer admin role.
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
            (symbol_short!("vault"), symbol_short!("admin")),
            (current_admin, new_admin.clone()),
        );

        Ok(())
    }

    /// Upgrade contract WASM. Admin only.
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
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Events as _;
    use soroban_sdk::{vec, Env, IntoVal, TryFromVal, Val, Vec};

    fn setup_contract() -> (Env, Address, Address, TokenVaultContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TokenVaultContract);
        let client = TokenVaultContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        (env, admin, contract_id, client)
    }

    #[test]
    fn test_initialize() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);

        client.initialize(&admin, &signers, &1);

        let stats = client.get_stats();
        assert_eq!(stats.admin, admin);
        assert_eq!(stats.total_locked, 0);
        assert_eq!(stats.lock_count, 0);
    }

    #[test]
    fn test_lock_tokens() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);
        client.initialize(&admin, &signers, &1);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(
            &owner,
            &1_000_000,
            &86400, // 1 day
            &symbol_short!("team"),
        );
        assert_eq!(lock_id, 1);

        let lock = client.get_lock(&lock_id);
        assert_eq!(lock.amount, 1_000_000);
        assert_eq!(lock.claimed, false);
        assert_eq!(lock.owner, owner);

        let stats = client.get_stats();
        assert_eq!(stats.total_locked, 1_000_000);
    }

    #[test]
    fn test_create_vesting() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);
        client.initialize(&admin, &signers, &1);

        let beneficiary = Address::generate(&env);
        let vesting_id = client.create_vesting(
            &admin,
            &beneficiary,
            &10_000_000,
            &31536000, // 1 year
            &7776000,  // 90 day cliff
            &symbol_short!("hire"),
        );

        assert_eq!(vesting_id, 1);

        let schedule = client.get_vesting(&vesting_id);
        assert_eq!(schedule.total_amount, 10_000_000);
        assert_eq!(schedule.claimed_amount, 0);
        assert_eq!(schedule.beneficiary, beneficiary);
    }

    #[test]
    fn test_approve_emergency() {
        let (env, admin, contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);
        client.initialize(&admin, &signers, &2);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(&owner, &1_000_000, &86400, &symbol_short!("team"));

        let approval_count = client.approve_emergency(&signer1, &lock_id);
        assert_eq!(approval_count, 1);

        let lock = client.get_lock(&lock_id);
        assert_eq!(lock.claimed, false);

        let events = env.events().all();
        let event = events.get(events.len() - 1).unwrap();
        assert_eq!(event.0, contract_id);
        let expected_topics: Vec<Val> = vec![
            &env,
            symbol_short!("vault").into_val(&env),
            symbol_short!("emrg_ap").into_val(&env),
        ];
        assert_eq!(event.1, expected_topics);
        let expected_data: Vec<Val> = vec![
            &env,
            lock_id.into_val(&env),
            signer1.into_val(&env),
            1u32.into_val(&env),
        ];
        let actual_data: Vec<Val> = Vec::try_from_val(&env, &event.2).unwrap();
        assert_eq!(actual_data, expected_data);
    }

    #[test]
    fn test_approve_emergency_rejects_non_signer() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);
        client.initialize(&admin, &signers, &1);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(&owner, &500_000, &3600, &symbol_short!("ops"));

        let outsider = Address::generate(&env);
        let result = client.try_approve_emergency(&outsider, &lock_id);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_emergency_unlock_requires_threshold() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);
        client.initialize(&admin, &signers, &2);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(&owner, &750_000, &7200, &symbol_short!("team"));

        client.approve_emergency(&signer1, &lock_id);

        let result = client.try_emergency_unlock(&owner, &lock_id);
        assert_eq!(result, Err(Ok(Error::EmergencyNotApproved)));
    }

    #[test]
    fn test_emergency_unlock() {
        let (env, admin, contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);
        client.initialize(&admin, &signers, &2);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(&owner, &900_000, &86400, &symbol_short!("team"));

        client.approve_emergency(&signer1, &lock_id);
        client.approve_emergency(&signer2, &lock_id);

        let unlocked = client.emergency_unlock(&owner, &lock_id);
        assert_eq!(unlocked, 900_000);

        let lock = client.get_lock(&lock_id);
        assert_eq!(lock.claimed, true);

        let stats = client.get_stats();
        assert_eq!(stats.total_locked, 0);

        let events = env.events().all();
        let event = events.get(events.len() - 1).unwrap();
        assert_eq!(event.0, contract_id);
        let expected_topics: Vec<Val> = vec![
            &env,
            symbol_short!("vault").into_val(&env),
            symbol_short!("emrg_ex").into_val(&env),
        ];
        assert_eq!(event.1, expected_topics);
        let expected_data: Vec<Val> = vec![
            &env,
            lock_id.into_val(&env),
            owner.into_val(&env),
            900_000i128.into_val(&env),
        ];
        let actual_data: Vec<Val> = Vec::try_from_val(&env, &event.2).unwrap();
        assert_eq!(actual_data, expected_data);
    }

    #[test]
    fn test_duplicate_emergency_approval_is_rejected() {
        let (env, admin, _contract_id, client) = setup_contract();

        let signer1 = Address::generate(&env);
        let signers = Vec::from_array(&env, [signer1.clone()]);
        client.initialize(&admin, &signers, &1);

        let owner = Address::generate(&env);
        let lock_id = client.lock_tokens(&owner, &250_000, &1800, &symbol_short!("ops"));

        client.approve_emergency(&signer1, &lock_id);
        let result = client.try_approve_emergency(&signer1, &lock_id);
        assert_eq!(result, Err(Ok(Error::AlreadyApprovedEmergency)));
    }
}
