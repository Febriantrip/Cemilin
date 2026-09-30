# Security

CemilIn is a portfolio and application repository. Production credentials, customer data, payment evidence, and uploaded business assets must never be committed to Git.

## Keep out of source control

Do not commit:

- `backend/.env` or any production environment file
- database passwords or connection URLs
- JWT secrets
- admin credentials
- Railway secrets
- customer names, phone numbers, addresses, or order exports
- payment-proof uploads
- production QRIS images containing merchant-specific payment data
- private bank-account configuration
- database dumps containing real transactions
- backup archives containing any of the above

The repository intentionally tracks only `.env.example` placeholders.

## Production configuration

Use Railway service variables for production credentials.

`JWT_SECRET` must be a random value of at least 32 characters. The server performs a startup check and rejects missing, short, or placeholder secrets.

The first-admin variables are intended for controlled account setup:

~~~text
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
~~~

After creating the first production admin, remove `ADMIN_PASSWORD` from service variables.

## Uploaded files

Runtime uploads are stored outside Git under `backend/uploads/`.

For Railway deployment, use a persistent volume for uploads as documented in [PRODUCTION-RAILWAY.md](PRODUCTION-RAILWAY.md).

## Accidental credential exposure

If a real credential is ever committed:

1. revoke or rotate the credential immediately
2. remove it from the repository and Git history where appropriate
3. redeploy with the replacement credential
4. review logs and access history for unexpected use

Deleting a secret from the latest commit alone does not make an exposed credential safe again.

## Reporting

If this repository later receives external contributors, avoid placing sensitive production details in public issues. Share only the minimum information required to reproduce a security problem.
