# Flagship Procurement Demo App

A two-tier procurement-lite application demonstrating the Flagship Azure Landing Zone.

## Architecture

- API (api/) - Express + Node 20 + MySQL2, deployed to app-flagship-procurement-api-{env} Azure App Services
- Web (web/) - Vite + React + Tailwind, deployed to app-flagship-procurement-web-{env} Azure App Services
- Database - MySQL Flexible Server with VNet integration, accessed via Key Vault-referenced credentials
- Deploy - GitHub Actions with OIDC federation, no stored secrets

## Local development

Run `npm install` and `npm run dev` in api/ and web/ directories separately.

The web dev server proxies /api/* to localhost:3000.

## Deployment

Push to main triggers deployment to prod App Services via OIDC.
