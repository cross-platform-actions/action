# Cross-Platform GitHub Action

This project provides a GitHub action for running GitHub Action workflows on
multiple platforms. This includes platforms that GitHub Actions doesn't
currently natively support.

## Features

Some of the features that are supported include:

- Multiple operating system with one single action
- Multiple versions of each operating system
- Allows to use default shell or Bash shell
- Low boot overhead
- Fast execution

## Usage

Here's a sample workflow file which will setup a matrix resulting in two jobs.
One which will run on FreeBSD 12.2 and one which runs on OpenBSD 6.8.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: macos-10.15
    strategy:
      matrix:
        os:
          - name: freebsd
            version: 12.2
          - name: openbsd
            version: 6.8

    steps:
      - uses: actions/checkout@v2

      - name: Test on ${{ matrix.os.name }}
        uses: cross-platform-actions/action@v0.0.1
        env:
          MY_ENV1: MY_ENV1
          MY_ENV2: MY_ENV2
        with:
          environment_variables: MY_ENV1 MY_ENV2
          operating_system: ${{ matrix.os.name }}
          version: ${{ matrix.os.version }}
          shell: bash
          run: |
            uname -a
            echo $SHELL
            pwd
            ls -lah
            whoami
            env | sort
```

The FreeBSD and OpenBSD jobs need to run on: `macos-10.15`. Jobs for the other
platforms need to run on a Linux runner.

### Inputs

This section lists the available inputs for the action.

| Input                   | Required | Default Value | Description                                                                                                                                            |
| ----------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run`                   | ✓        | ✗             | Runs command-line programs using the operating system's shell. This will be executed inside the virtual machine.                                       |
| `operating_system`      | ✓        | ✗             | The type of operating system to run the job on. See [Supported Platforms](#supported-platforms).                                                       |
| `version`               | ✓        | ✗             | The version of the operating system to use. See [Supported Platforms](#supported-platforms).                                                           |
| `shell`                 | ✗        | `default`     | The shell to use to execute the commands. Defaults to the default shell for the given operating system. Allowed values are: `default`, `sh` and `bash` |
| `environment_variables` | ✗        | `""`          | A list of environment variables to forward to the virtual machine. The list should be separated with spaces.                                           |

## Supported Platforms

This sections lists the currently supported platforms by operating system. Each
operating system will list which versions are supported.

### [OpenBSD][openbsd_builder]

| Version | x86-64 |
| ------- | ------ |
| 6.9     | ✓      |
| 6.8     | ✓      |

### [FreeBSD][freebsd_builder]

| Version | x86-64 |
| ------- | ------ |
| 13.0    | ✓      |
| 12.2    | ✓      |

### [NetBSD][netbsd_builder]

| Version | x86-64 |
| ------- | ------ |
| 9.2     | ✓      |

## Under the Hood

GitHub Actions currently only support the following platforms: macOS, Linux and
Windows. To be able to run other platforms, this GitHub action runs the
commands inside a virtual machine (VM). If the host platform is macOS the
hypervisor can take advantage of nested virtualization.

The FreeBSD and OpenBSD VMs run on the [xhyve][xhyve] hypervisor (on a macOS
host), while the other platforms run on the [QEMU][qemu] hypervisor (on a Linux
host). xhyve is built on top of Apple's [Hypervisor][hypervisor_framework]
framework. The Hypervisor framework allows to implement hypervisors with
support for hardware acceleration without the need for kernel extensions. xhyve
is a lightweight hypervisor that boots the guest operating systems quickly and
requires no dependencies outside of what's provided by the system. QEMU is a
more general purpose hypervisor that runs on most host platforms and supports
most guest systems. It's a bit slower than xhyve because it's general purpose
and it cannot use nested virtualization on the Linux hosts provided by GitHub.

The VM images running inside the hypervisor are built using [Packer][packer].
It's a tool for automatically creating VM images, installing the guest
operating system and doing any final provisioning.

The GitHub action uses SSH to communicate and execute commands inside the VM.
It uses [rsync][rsync] to share files between the guest VM and the host. xhyve
does not have any native support for sharing files. To authenticate the SSH
connection a unique key pair is used. This pair is generated each time the
action is run. The public key is added to the VM image and the private key is
stored on the host. Since xhyve does not support file sharing, a secondar hard
drive, which is backed by a file, is created. The public key is stored on this
hard drive, which is then mounted by the VM. At boot time, the secondary hard
drive will be identified and the public key will be copied to the appropriate
location.

To reduce the time it takes for the GitHub action to start executing the
commands specified by the user, it aims to boot the guest operating systems as
fast as possible. This is achieved in a couple of ways:

- By downloading [resources][resources], like the hypervisor and a few other
  tools, instead of installing them through a package manager

- No compression is used for the resources that are downloaded. The size is
  small enough anyway and it's faster to download the uncompressed data than
  it is to download compressed data and then uncompress it.

- It leverages `async`/`await` to perform tasks asynchronously. Like
  downloading the VM image and other resources at the same time

- It performs as much as possible of the setup ahead of time when the VM image
  is provisioned

[xhyve]: https://github.com/machyve/xhyve
[qemu]: https://www.qemu.org
[hypervisor_framework]: https://developer.apple.com/library/mac/documentation/DriversKernelHardware/Reference/Hypervisor/index.html
[rsync]: https://en.wikipedia.org/wiki/Rsync
[resources]: https://github.com/cross-platform-actions/resources
[packer]: https://www.packer.io
[openbsd_builder]: https://github.com/cross-platform-actions/openbsd-builder
[freebsd_builder]: https://github.com/cross-platform-actions/freebsd-builder
[netbsd_builder]: https://github.com/cross-platform-actions/netbsd-builder
