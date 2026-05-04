# Security Specification - Realcred App

## Data Invariants
1. **Users**:
   - `uid` must match the document ID.
   - `role` is immutable by the client once set.
   - `email` must be a valid format and match the auth token.
2. **Proposals**:
   - Must belong to an existing user.
   - `status` can only be set to `PENDING` by the client on creation.
   - Only admins can change `status` or add `bankRef`.
3. **Documents**:
   - Must reference a valid `proposalId`.
   - `url` must be a valid HTTPS URI string.

## The "Dirty Dozen" Payloads (Deny List)
These payloads *must* be rejected by Firestore Rules:
1. **Identity Spoofing**: Creating a proposal with another user's `userId`.
2. **Privilege Escalation**: Updating own `role` to `admin` in `/users/{uid}`.
3. **Status Hijacking**: Updating own proposal status from `PENDING` to `APPROVED`.
4. **Shadow Updates**: Injecting a hidden `isVerified: true` field into a user profile.
5. **Resource Exhaustion**: Sending a 1MB string as a `displayName`.
6. **ID Poisoning**: Using `../evil/path` as a document ID.
7. **Orphaned Records**: Creating a document for a proposal that doesn't exist.
8. **Temporal Spoofing**: Setting `createdAt` to a date in the past.
9. **Type Confusion**: Sending a string where a number is expected (e.g., `value: "1000"`).
10. **State Skipping**: Moving a proposal from `REJECTED` back to `PENDING` without admin approval.
11. **PII Leak**: A client attempting to list all user profiles.
12. **Null Injection**: Sending null for required fields like `type` or `value`.
