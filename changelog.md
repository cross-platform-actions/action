# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2023-01-16
### Added
- Add support for FreeBSD 13.1
- Add support for FreeBSD 12.4

## [0.8.0] - 2023-01-13
### Added
- Add support for OpenBSD 7.2 ([openbsd-builder#13](https://github.com/cross-platform-actions/openbsd-builder/issues/13))

### Changed
- Bump QEMU to 7.2

## [0.7.0] - 2022-12-25
### Added
- Add support for OpenBSD ARM64
- Add support for running on macOS 12 hosts

### Changed
- Run action using Node 16. This fixes a deprecation message
- Strip resource binaries to reduce space

### Fixed
- Error in /home/runner/.ssh/config ([#14](https://github.com/cross-platform-actions/action/issues/14))

## [0.6.2] - 2022-07-06
### Fixed
- v0.6.1 only works if debug mode is enabled ([#12](https://github.com/cross-platform-actions/action/issues/12))

## [0.6.1] - 2022-07-03
### Changed
- Only print files synced in debug mode ([#11](https://github.com/cross-platform-actions/action/issues/11))

## [0.6.0] - 2022-06-14
### Added
- Add support for OpenBSD 7.1 ([openbsd-builder#9](https://github.com/cross-platform-actions/openbsd-builder/pull/9))

## [0.5.0] - 2022-05-31
### Added
- Add support for running OpenBSD on Linux ([#9](https://github.com/cross-platform-actions/action/issues/9))

## [0.4.0] - 2022-05-10
### Added
- Add support for running FreeBSD on Linux ([#8](https://github.com/cross-platform-actions/action/issues/8))

## [0.3.1] - 2021-12-06
### Fixed
- Missing QEMU dependency glib ([#5](https://github.com/cross-platform-actions/action/issues/5))

## [0.3.0] - 2021-11-13
### Added
- Added support for NetBSD ([#1](https://github.com/cross-platform-actions/action/issues/1))

## [0.2.0] - 2021-09-04
### Added
- Added support for FreeBSD 13.0
- Added support for OpenBSD 6.9

## [0.0.2] - 2021-06-22
### Added
- Added branding to the GitHub action in the marketplace

## [0.0.1] - 2021-06-02
### Added
- Initial release

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/cross-platform-actions/action/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/cross-platform-actions/action/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/cross-platform-actions/action/compare/v0.6.0...v0.7.0
[0.6.2]: https://github.com/cross-platform-actions/action/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/cross-platform-actions/action/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/cross-platform-actions/action/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/cross-platform-actions/action/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/cross-platform-actions/action/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/cross-platform-actions/action/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/cross-platform-actions/action/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/cross-platform-actions/action/compare/v0.0.2...v0.2.0
[0.0.2]: https://github.com/cross-platform-actions/action/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/cross-platform-actions/action/releases/tag/v0.0.1
