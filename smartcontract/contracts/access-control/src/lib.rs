#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, Vec,
};

// ============================================================================
// Error Codes
// ============================================================================

/// Contract error codes for the Access Control module.
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
    /// Role not found for the given address.
    RoleNotFound = 4,
    /// Address already has a role assigned.
    RoleAlreadyAssigned = 5,
    /// Invalid role level specified.
    InvalidRole = 6,
    /// Cannot remove the contract owner.
    CannotRemoveOwner = 7,
    /// Action requires higher privilege level.
    InsufficientPrivilege = 8,
}

// ============================================================================
// Storage Types
// ============================================================================

/// Role levels in the access control hierarchy.
/// Higher values = more permissions.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Role {
    /// Can only view data, no write operations.
    Viewer = 1,
    /// Can participate (vote, deposit) but cannot manage.
    Member = 2,
    /// Can manage members and moderate operations.
    Admin = 3,
    /// Full control, can change any setting.
    Owner = 4,
}

/// Storage keys for access control.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Whether contract is initialized.
    Initialized,
    /// The contract owner address.
    Owner,
    /// Role assignment for an address.
    Role(Address),
    /// List of all addresses with roles.
    AllMembers,
    /// Total number of each role type.
    RoleCount(u32),
}

/// Role assignment record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleAssignment {
    /// The address holding the role.
    pub address: Address,
    /// The assigned role.
    pub role: Role,
    /// When the role was assigned.
    pub assigned_at: u64,
    /// Who assigned this role.
    pub assigned_by: Address,
}

/// Access control summary.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessSummary {
    pub owner: Address,
    pub total_members: u32,
    pub owner_count: u32,
    pub admin_count: u32,
    pub member_count: u32,
    pub viewer_count: u32,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct AccessControlContract;

#[contractimpl]
impl AccessControlContract {
    // ========================================================================
    // Initialization
    // ========================================================================

    /// Initialize the access control contract.
    ///
    /// # Arguments
    /// * `owner` - The address that will have Owner role.
    pub fn initialize(env: Env, owner: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        owner.require_auth();

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Owner, &owner);

        // Assign Owner role
        let assignment = RoleAssignment {
            address: owner.clone(),
            role: Role::Owner,
            assigned_at: env.ledger().timestamp(),
            assigned_by: owner.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Role(owner.clone()), &assignment);

        // Initialize member list with owner
        let mut members = Vec::new(&env);
        members.push_back(owner.clone());
        env.storage().instance().set(&DataKey::AllMembers, &members);

        // Initialize role counts
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(Role::Owner as u32), &1_u32);
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(Role::Admin as u32), &0_u32);
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(Role::Member as u32), &0_u32);
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(Role::Viewer as u32), &0_u32);

        env.events()
            .publish((symbol_short!("acl"), symbol_short!("init")), owner.clone());

        log!(&env, "Access control initialized with owner {:?}", owner);
        Ok(())
    }

    // ========================================================================
    // Role Assignment
    // ========================================================================

    /// Assign a role to an address.
    /// Only admins and owners can assign roles.
    /// Admins can only assign Member and Viewer roles.
    /// Only owners can assign Admin roles.
    ///
    /// # Arguments
    /// * `assignor` - The address assigning the role (must be Admin or Owner).
    /// * `target` - The address receiving the role.
    /// * `role` - The role to assign.
    pub fn assign_role(
        env: Env,
        assignor: Address,
        target: Address,
        role: Role,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        assignor.require_auth();

        // Get assignor's role
        let assignor_role = Self::internal_get_role(&env, &assignor)?;

        // Only Owner can assign Owner or Admin roles
        match role {
            Role::Owner | Role::Admin => {
                if assignor_role != Role::Owner {
                    return Err(Error::InsufficientPrivilege);
                }
            }
            Role::Member | Role::Viewer => {
                // Admin or Owner can assign these
                if assignor_role != Role::Owner && assignor_role != Role::Admin {
                    return Err(Error::InsufficientPrivilege);
                }
            }
        }

        // Get current role count for the new role
        let role_val = role.clone() as u32;
        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(role_val))
            .unwrap_or(0);

        // If target already has a role, decrement old role count
        if env
            .storage()
            .persistent()
            .has(&DataKey::Role(target.clone()))
        {
            let old_assignment: RoleAssignment = env
                .storage()
                .persistent()
                .get(&DataKey::Role(target.clone()))
                .unwrap();
            let old_role_val = old_assignment.role as u32;
            let mut old_count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::RoleCount(old_role_val))
                .unwrap_or(1);
            if old_count > 0 {
                old_count -= 1;
            }
            env.storage()
                .instance()
                .set(&DataKey::RoleCount(old_role_val), &old_count);
        } else {
            // New member — add to the list
            let mut members: Vec<Address> = env
                .storage()
                .instance()
                .get(&DataKey::AllMembers)
                .unwrap_or(Vec::new(&env));
            members.push_back(target.clone());
            env.storage().instance().set(&DataKey::AllMembers, &members);
        }

        // Create assignment
        let assignment = RoleAssignment {
            address: target.clone(),
            role: role.clone(),
            assigned_at: env.ledger().timestamp(),
            assigned_by: assignor.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Role(target.clone()), &assignment);

        // Update role count
        count += 1;
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(role_val), &count);

        env.events().publish(
            (symbol_short!("acl"), symbol_short!("assign")),
            (target.clone(), role, assignor.clone()),
        );

        Ok(())
    }

    /// Revoke a role from an address.
    /// Owners cannot be removed. Only owners can revoke admin roles.
    pub fn revoke_role(env: Env, revoker: Address, target: Address) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        revoker.require_auth();

        let revoker_role = Self::internal_get_role(&env, &revoker)?;

        // Must be admin or owner to revoke
        if revoker_role != Role::Owner && revoker_role != Role::Admin {
            return Err(Error::InsufficientPrivilege);
        }

        // Get target's current assignment
        let target_assignment: RoleAssignment = env
            .storage()
            .persistent()
            .get(&DataKey::Role(target.clone()))
            .ok_or(Error::RoleNotFound)?;

        // Cannot remove owners
        if target_assignment.role == Role::Owner {
            return Err(Error::CannotRemoveOwner);
        }

        // Only owners can revoke admin roles
        if target_assignment.role == Role::Admin && revoker_role != Role::Owner {
            return Err(Error::InsufficientPrivilege);
        }

        // Decrement role count
        let role_val = target_assignment.role as u32;
        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(role_val))
            .unwrap_or(1);
        if count > 0 {
            count -= 1;
        }
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(role_val), &count);

        // Remove role assignment
        env.storage()
            .persistent()
            .remove(&DataKey::Role(target.clone()));

        // Remove from members list
        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllMembers)
            .unwrap_or(Vec::new(&env));
        let mut new_members = Vec::new(&env);
        for i in 0..members.len() {
            let m = members.get(i).unwrap();
            if m != target {
                new_members.push_back(m);
            }
        }
        env.storage()
            .instance()
            .set(&DataKey::AllMembers, &new_members);

        env.events().publish(
            (symbol_short!("acl"), symbol_short!("revoke")),
            (target.clone(), revoker.clone()),
        );

        Ok(())
    }

    // ========================================================================
    // Permission Checks (for cross-contract use)
    // ========================================================================

    /// Check if an address has at least the specified role level.
    /// Returns true if the address's role >= required role.
    pub fn has_permission(env: Env, address: Address, required_role: Role) -> bool {
        let role_result = Self::internal_get_role(&env, &address);
        match role_result {
            Ok(role) => role >= required_role,
            Err(_) => false,
        }
    }

    /// Check if an address is the contract owner.
    pub fn is_owner(env: Env, address: Address) -> bool {
        let role_result = Self::internal_get_role(&env, &address);
        match role_result {
            Ok(role) => role == Role::Owner,
            Err(_) => false,
        }
    }

    /// Check if an address is an admin or owner.
    pub fn is_admin_or_above(env: Env, address: Address) -> bool {
        let role_result = Self::internal_get_role(&env, &address);
        match role_result {
            Ok(role) => role >= Role::Admin,
            Err(_) => false,
        }
    }

    /// Check if an address is a member or above.
    pub fn is_member_or_above(env: Env, address: Address) -> bool {
        let role_result = Self::internal_get_role(&env, &address);
        match role_result {
            Ok(role) => role >= Role::Member,
            Err(_) => false,
        }
    }

    // ========================================================================
    // Query Functions
    // ========================================================================

    /// Get the role of an address.
    pub fn get_role(env: Env, address: Address) -> Result<RoleAssignment, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Role(address))
            .ok_or(Error::RoleNotFound)
    }

    /// Get all members with roles.
    pub fn get_all_members(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::AllMembers)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the access control summary.
    pub fn get_summary(env: Env) -> Result<AccessSummary, Error> {
        Self::require_initialized(&env)?;

        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(Error::NotInitialized)?;
        let members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllMembers)
            .unwrap_or(Vec::new(&env));
        let owner_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(Role::Owner as u32))
            .unwrap_or(0);
        let admin_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(Role::Admin as u32))
            .unwrap_or(0);
        let member_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(Role::Member as u32))
            .unwrap_or(0);
        let viewer_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(Role::Viewer as u32))
            .unwrap_or(0);

        Ok(AccessSummary {
            owner,
            total_members: members.len(),
            owner_count,
            admin_count,
            member_count,
            viewer_count,
        })
    }

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /// Transfer ownership to a new address.
    /// Only the current owner can transfer ownership.
    pub fn transfer_ownership(
        env: Env,
        current_owner: Address,
        new_owner: Address,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        current_owner.require_auth();

        let stored_owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(Error::NotInitialized)?;

        if current_owner != stored_owner {
            return Err(Error::Unauthorized);
        }

        // Update owner
        env.storage().instance().set(&DataKey::Owner, &new_owner);

        // Update role assignments
        let new_owner_assignment = RoleAssignment {
            address: new_owner.clone(),
            role: Role::Owner,
            assigned_at: env.ledger().timestamp(),
            assigned_by: current_owner.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Role(new_owner.clone()), &new_owner_assignment);

        // Demote old owner to admin
        let old_owner_assignment = RoleAssignment {
            address: current_owner.clone(),
            role: Role::Admin,
            assigned_at: env.ledger().timestamp(),
            assigned_by: current_owner.clone(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Role(current_owner.clone()), &old_owner_assignment);

        // Ensure new owner is in members list
        let mut members: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::AllMembers)
            .unwrap_or(Vec::new(&env));
        let mut found = false;
        for i in 0..members.len() {
            if members.get(i).unwrap() == new_owner {
                found = true;
                break;
            }
        }
        if !found {
            members.push_back(new_owner.clone());
            env.storage().instance().set(&DataKey::AllMembers, &members);
        }

        // Update role counts
        let mut admin_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RoleCount(Role::Admin as u32))
            .unwrap_or(0);
        admin_count += 1;
        env.storage()
            .instance()
            .set(&DataKey::RoleCount(Role::Admin as u32), &admin_count);

        env.events().publish(
            (symbol_short!("acl"), symbol_short!("owner")),
            (current_owner, new_owner.clone()),
        );

        Ok(())
    }

    /// Upgrade contract WASM. Owner only.
    pub fn upgrade(
        env: Env,
        owner: Address,
        new_wasm_hash: soroban_sdk::BytesN<32>,
    ) -> Result<(), Error> {
        Self::require_initialized(&env)?;

        owner.require_auth();

        let stored_owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(Error::NotInitialized)?;
        if owner != stored_owner {
            return Err(Error::Unauthorized);
        }

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

    fn internal_get_role(env: &Env, address: &Address) -> Result<Role, Error> {
        let assignment: RoleAssignment = env
            .storage()
            .persistent()
            .get(&DataKey::Role(address.clone()))
            .ok_or(Error::RoleNotFound)?;
        Ok(assignment.role)
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

    fn setup_contract() -> (Env, Address, AccessControlContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(AccessControlContract, ());
        let client = AccessControlContractClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        (env, owner, client)
    }

    #[test]
    fn test_initialize() {
        let (env, owner, client) = setup_contract();

        client.initialize(&owner);

        let summary = client.get_summary();
        assert_eq!(summary.owner, owner);
        assert_eq!(summary.total_members, 1);
        assert_eq!(summary.owner_count, 1);
    }

    #[test]
    fn test_assign_roles() {
        let (env, owner, client) = setup_contract();

        client.initialize(&owner);

        let admin = Address::generate(&env);
        let member = Address::generate(&env);
        let viewer = Address::generate(&env);

        // Owner assigns Admin
        client.assign_role(&owner, &admin, &Role::Admin);
        // Owner assigns Member
        client.assign_role(&owner, &member, &Role::Member);
        // Admin assigns Viewer
        client.assign_role(&admin, &viewer, &Role::Viewer);

        let summary = client.get_summary();
        assert_eq!(summary.total_members, 4);
        assert_eq!(summary.admin_count, 1);
        assert_eq!(summary.member_count, 1);
        assert_eq!(summary.viewer_count, 1);
    }

    #[test]
    fn test_permission_checks() {
        let (env, owner, client) = setup_contract();

        client.initialize(&owner);

        let member = Address::generate(&env);
        client.assign_role(&owner, &member, &Role::Member);

        assert_eq!(client.is_owner(&owner), true);
        assert_eq!(client.is_owner(&member), false);
        assert_eq!(client.is_member_or_above(&member), true);
        assert_eq!(client.is_admin_or_above(&member), false);
        assert_eq!(client.has_permission(&member, &Role::Viewer), true);
        assert_eq!(client.has_permission(&member, &Role::Admin), false);
    }

    #[test]
    fn test_revoke_role() {
        let (env, owner, client) = setup_contract();

        client.initialize(&owner);

        let member = Address::generate(&env);
        client.assign_role(&owner, &member, &Role::Member);

        assert_eq!(client.is_member_or_above(&member), true);

        client.revoke_role(&owner, &member);

        assert_eq!(client.is_member_or_above(&member), false);
    }
}
