# Security

## Reporting a Security Vulnerability

To report a security vulnerability in Cross-Platform Action or any of its
associated projects [^1], use GitHub's built-in functionality for
reporting a security advisory [^2].

## Disclosure policy

Here is the security disclosure policy for Cross-Platform Action:

* The security report is received and is assigned a primary handler. This person
    will coordinate the fix and release process. The problem is validated
    against all supported Cross-Platform Action versions. Once confirmed, a
    list of all affected versions is determined. Code is audited to find any
    potential similar problems. Fixes are prepared for all supported releases.
    These fixes are not committed to the public repository but rather held
    locally pending the announcement

* A suggested embargo date for this vulnerability is chosen

* On the embargo date, the vulnerability is published using GitHub's
    functionality for security advisories. The changes are pushed to the public
    repository and a new release is issued

* This process can take some time. We will try to handle the bug as quickly as
    possible; however, we must follow the release process above to ensure that
    we handle disclosure consistently

## Vulnerability Reporting Guidelines

When reporting security vulnerabilities, reporters must adhere to the following
guidelines:

1. **Reporting Method**: Only use the methods described in this document to
    report a security vulnerability

1. **No Harmful Actions**: Security research and vulnerability reporting must not:
    * Cause damage to running systems or production environments
    * Disrupt Cross Platform Action development or infrastructure
    * Affect other users' applications or systems
    * Include actual exploits that could harm users
    * Involve social engineering or phishing attempts

1. **Responsible Testing**: When testing potential vulnerabilities:
    * Use isolated, controlled environments
    * Do not test on production systems without prior authorization. Initiate
        contact with the Cross Platform Action team by following the methods
        for reporting a security vulnerability described in this document
    * Do not attempt to access or modify other users' data
    * Immediately stop testing if unauthorized access is gained accidentally

1. **Report Quality**
    * Provide clear, detailed steps to reproduce the vulnerability
    * Include only the minimum proof of concept required to demonstrate the issue
    * Remove any malicious payloads or components that could cause harm

Failure to follow these guidelines may result in:

* Rejection of the vulnerability report
* Legal action in cases of malicious intent

[^1]: https://github.com/orgs/cross-platform-actions/repositories
[^2]: https://github.com/cross-platform-actions/action/security/advisories/new
