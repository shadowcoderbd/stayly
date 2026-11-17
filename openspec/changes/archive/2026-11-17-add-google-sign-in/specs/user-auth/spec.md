# Spec Delta

## Purpose

Defines how people get a Stayly account and a signed-in session, including which sign-in methods are offered, what account a sign-in produces, and where the user lands afterwards.

## ADDED Requirements

### Requirement: Google sign-in is offered only when configured
The system SHALL offer Google sign-in only when both a Google client ID and client secret are configured. When neither is configured, the sign-in and sign-up pages SHALL NOT show a Google option and Google sign-in requests SHALL be refused. Configuring only one of the two SHALL prevent the application from starting.

#### Scenario: Credentials configured
- **WHEN** both Google credentials are configured and a visitor opens `/login` or `/signup`
- **THEN** the page shows a "Continue with Google" option next to the email/password form

#### Scenario: Credentials not configured
- **WHEN** no Google credentials are configured and a visitor opens `/login` or `/signup`
- **THEN** the page shows only the email/password form
- **AND** a request to start Google sign-in is rejected

#### Scenario: Only one credential configured
- **WHEN** the application starts with a Google client ID but no client secret (or the reverse)
- **THEN** startup fails with an error naming the missing variable

### Requirement: First Google sign-in creates a customer account
When someone completes Google sign-in with an email that has no Stayly account, the system SHALL create an account with the customer role, using the name, email and profile picture from Google, mark its email as verified, and sign the person in.

#### Scenario: New Google user
- **WHEN** a person with no Stayly account completes Google sign-in from `/signup` or `/login`
- **THEN** a customer account is created with their Google name, email and picture
- **AND** they are signed in

#### Scenario: Returning Google user
- **WHEN** a person who created their account with Google completes Google sign-in again
- **THEN** they are signed in to the same account, with their existing bookings

### Requirement: Google sign-in does not take over existing password accounts
If the Google email already belongs to an account that cannot sign in with Google, the system SHALL NOT link the two or sign the person in. It SHALL return them to `/login` with a message telling them to sign in with their password. The existing account SHALL be left unchanged.

#### Scenario: Email already registered with a password
- **WHEN** a person completes Google sign-in with an email that already belongs to an email/password account
- **THEN** no session is created and the existing account is unchanged
- **AND** they land on `/login` with the message "This email already has a Stayly account. Sign in with your password."

### Requirement: Google sign-in lands the user where password sign-in would
After a successful Google sign-in, the system SHALL send the user to the `redirectTo` path they started from if it is a safe same-site relative path. Otherwise admins SHALL go to `/admin/bookings` and everyone else to `/`.

#### Scenario: Started from a protected page
- **WHEN** a signed-out customer is sent to `/login?redirectTo=/bookings` and completes Google sign-in
- **THEN** they land on `/bookings`

#### Scenario: Unsafe redirect target
- **WHEN** Google sign-in starts with `redirectTo=//evil.example`
- **THEN** the target is ignored and the user lands on the default page for their role

#### Scenario: Admin without a redirect target
- **WHEN** an admin whose account signs in with Google completes Google sign-in without `redirectTo`
- **THEN** they land on `/admin/bookings`

### Requirement: Failed Google sign-in returns to the login page with a message
When Google sign-in does not complete, the system SHALL return the user to `/login` with a readable message instead of an error page. This covers the user cancelling at Google, a provider error, and a suspended account. The user SHALL NOT be signed in, and the message SHALL NOT expose internal error details.

#### Scenario: User cancels at Google
- **WHEN** the user cancels on Google's consent screen
- **THEN** they land on `/login` with the message "Google sign-in was cancelled or failed. Please try again."

#### Scenario: Suspended account
- **WHEN** a suspended user completes Google sign-in
- **THEN** no session is created and they land on `/login` with the message "This account is suspended."

### Requirement: Email and password sign-in is unaffected
Adding Google sign-in SHALL NOT change email/password sign-up, sign-in or sign-out, whether or not Google is configured.

#### Scenario: Password sign-in with Google enabled
- **WHEN** Google sign-in is configured and a user signs in with a correct email and password
- **THEN** they are signed in and redirected exactly as before this change
