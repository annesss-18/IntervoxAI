# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at IntervoxAI. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue
- Discuss the vulnerability publicly before it's fixed
- Exploit the vulnerability

### Do

1. **Email us directly** at security@intervoxai.com (or your preferred contact)
2. **Include details**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release cycle

### Scope

The following are in scope:

- Authentication & Authorization flaws
- Data exposure vulnerabilities
- XSS, CSRF, and injection attacks
- Server-side vulnerabilities
- API security issues

### Out of Scope

- Social engineering attacks
- Physical security
- Denial of Service (DoS)
- Issues in third-party dependencies (report to them directly)

## Security Best Practices

This project implements:

- **HTTPS Only**: Strict Transport Security (HSTS)
- **Content Security Policy**: Prevents XSS attacks
- **Rate Limiting**: Protects against abuse
- **Input Validation**: Zod schemas for all inputs
- **Firebase Security Rules**: Firestore access control
- **Environment Variables**: Secrets never in code

## Acknowledgments

We appreciate security researchers who help keep IntervoxAI safe. Contributors will be acknowledged in our security hall of fame (with permission).
