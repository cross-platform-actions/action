# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.20.0] - 2023-10-24
### Added
- Add support for disabling file syncing ([#65](https://github.com/cross-platform-actions/action/issues/65)).
    This adds a new input parameter, `sync_files`. It allows to specify
    which directions files should be synced. From the runner to the VM,
    from the VM to the runner, both or none.

## [0.19.1] - 2023-10-07
### Fixed
- NetBSD - VM doesn't start ([#62](https://github.com/cross-platform-actions/action/issues/62))

## [0.19.0] - 2023-08-17
### Changed
- VMs running via QEMU only expose SSE and SSE2 CPU features ([#60](https://github.com/cross-platform-actions/action/issues/60)).
    This changes the machine to `q35` and the cpu to `max`, for x86-64 using
    the QEMU hypervisor. This adds more CPU features like AVX and AVX2.

## [0.18.0] - 2023-08-04
### Added
- Add support for custom image URLs ([#13](https://github.com/cross-platform-actions/action/pull/13))
- Add architecture alias for x86-64: x64 ([#58](https://github.com/cross-platform-actions/action/issues/58))

## [0.17.0] - 2023-07-25
### Changed
- Bump QEMU to 8.0.3 ([resources#3](https://github.com/cross-platform-actions/resources/pull/4))

## [0.16.0] - 2023-07-21
### Added
- Add support for FreeBSD ARM64 ([#55](https://github.com/cross-platform-actions/action/issues/55))

## [0.15.0] - 2023-06-12
### Changed
- Bump QEMU to 8.0.2 ([resources#3](https://github.com/cross-platform-actions/resources/pull/3))

## [0.14.0] - 2023-04-31
### Added
- Add support for NetBSD 9.3 ([#53](https://github.com/cross-platform-actions/action/issues/53))

## [0.13.0] - 2023-04-28
### Added
- Add support for FreeBSD 13.2 ([freebsd-builder#3](https://github.com/cross-platform-actions/freebsd-builder/pull/3))

## [0.12.0] - 2023-04-15
### Added
- Add support for OpenBSD 7.3

## [0.11.0] - 2023-04-03
### Added
- Add support for selecting hypervisor ([#50](https://github.com/cross-platform-actions/action/issues/50))
- Add support for NetBSD on macOS runners ([#28](https://github.com/cross-platform-actions/action/issues/28))
- Support for configuring memory ([#16](https://github.com/cross-platform-actions/action/issues/16))
- Support for configuring CPU core count ([#16](https://github.com/cross-platform-actions/action/issues/17))

### Changed
- Use output groups to hide all output except the run command
    (No output is removed, just hidden by default) ([#49](https://github.com/cross-platform-actions/action/issues/49))
- Remove support for IPv6 for NetBSD ([#46](https://github.com/cross-platform-actions/action/issues/46))
- Increased default memory to 13GB on macOS runner and to 6GB on Linux runners ([#16](https://github.com/cross-platform-actions/action/issues/16))
- Increased default CPU core count to 3 on macOS runner and to 2 on Linux runners ([#16](https://github.com/cross-platform-actions/action/issues/17))
- Changed from two CPU sockets to one CPU socket ([#16](https://github.com/cross-platform-actions/action/issues/17))

### Fixed
- NetBSD - very slow network ([#46](https://github.com/cross-platform-actions/action/issues/46))
- Action doesn't terminate when command fails ([#21](https://github.com/cross-platform-actions/action/issues/21))

## [0.10.0] - 2023-01-24
### Added
- Bundle all X11 sets for NetBSD ([netbsd-builder#3](https://github.com/cross-platform-actions/netbsd-builder/issues/3))

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

[Unreleased]: https://github.com/cross-platform-actions/action/compare/v0.20.0...HEAD

[0.19.1]: https://github.com/cross-platform-actions/action/compare/v0.19.1...v0.20.0
[0.19.1]: https://github.com/cross-platform-actions/action/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/cross-platform-actions/action/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/cross-platform-actions/action/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/cross-platform-actions/action/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/cross-platform-actions/action/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/cross-platform-actions/action/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/cross-platform-actions/action/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/cross-platform-actions/action/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/cross-platform-actions/action/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/cross-platform-actions/action/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/cross-platform-actions/action/compare/v0.9.0...v0.10.0
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
