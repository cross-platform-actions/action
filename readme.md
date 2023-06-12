# Cross-Platform GitHub Action

This project provides a GitHub action for running GitHub Actions workflows on
multiple platforms, including platforms that GitHub Actions doesn't currently natively support.

## `Features`

Some of the features that this action supports include:

- Multiple operating systems with one single action
- Multiple versions of each operating system
- Allows to use default shell or Bash shell
- Low boot overhead
- Fast execution

## `Usage`

### Minimal Example

Here's a sample workflow file which will run the given commands on FreeBSD 13.2.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: macos-12
    steps:
      - uses: actions/checkout@v3

      - name: Test
        uses: cross-platform-actions/action@v0.15.0
        with:
          operating_system: freebsd
          version: '13.2'
          run: |
            uname -a
            echo $SHELL
            pwd
            ls -lah
            whoami
            env | sort
```


### Full Example

Here's a sample workflow file which will set up a matrix resulting in four jobs.
One which will run on FreeBSD 13.2, one which runs OpenBSD 7.3, one which runs
NetBSD 9.3 and one which runs OpenBSD 7.3 on ARM64.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: ${{ matrix.os.host }}
    strategy:
      matrix:
        os:
          - name: freebsd
            architecture: x86-64
            version: '13.2'
            host: macos-12

          - name: openbsd
            architecture: x86-64
            version: '7.3'
            host: macos-12

          - name: openbsd
            architecture: arm64
            version: '7.3'
            host: ubuntu-latest

          - name: netbsd
            architecture: x86-64
            version: '9.3'
            host: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Test on ${{ matrix.os.name }}
        uses: cross-platform-actions/action@v0.15.0
        env:
          MY_ENV1: MY_ENV1
          MY_ENV2: MY_ENV2
        with:
          environment_variables: MY_ENV1 MY_ENV2
          operating_system: ${{ matrix.os.name }}
          architecture: ${{ matrix.os.architecture }}
          version: ${{ matrix.os.version }}
          shell: bash
          memory: 5G
          cpu_count: 4
          run: |
            uname -a
            echo $SHELL
            pwd
            ls -lah
            whoami
            env | sort
```

Different platforms need to run on different runners, so see the
[Runners](#runners) section below.

### Inputs

This section lists the available inputs for the action.

| Input                   | Required | Default Value     | Type    | Description                                                                                                                                                                                                              |
|-------------------------|----------|-------------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `run`                   | ✅       | ❌                | string  | Runs command-line programs using the operating system's shell. This will be executed inside the virtual machine.                                                                                                         |
| `operating_system`      | ✅       | ❌                | string  | The type of operating system to run the job on. See [Supported Platforms](#supported-platforms).                                                                                                                         |
| `version`               | ✅       | ❌                | string  | The version of the operating system to use. See [Supported Platforms](#supported-platforms).                                                                                                                             |
| `shell`                 | ❌       | `default`         | string  | The shell to use to execute the commands. Defaults to the default shell for the given operating system. Allowed values are: `default`, `sh` and `bash`                                                                   |
| `environment_variables` | ❌       | `""`              | string  | A list of environment variables to forward to the virtual machine. The list should be separated with spaces.                                                                                                             |
| `memory`                | ❌       | `6G` or `13G`     | string  | The amount of memory for the virtual machine. The default value is `6G` for Linux runners and `13G` for macOS runners.                                                                                                   |
| `cpu_count`             | ❌       | `2` or `3`  cores | integer | The number of CPU cores for the virtual machine. The default value is `2` for Linux runners and `3` for macOS runners.                                                                                                   |
| `hypervisor`            | ❌       | `xhyve` or `qemu` | string  | The hypervisor to use for running the virtual machine. For Linux runners the only valid value is `qemu`. For macOS runners the default for OpenBSD and FreeBSD is `xhyve` for all other platforms the default is `qemu`. |


All inputs are expected to be of the specified type. It's especially important
that you specify `version` as a string, using single or
double quotes. Otherwise YAML might interpet the value as a numeric value
instead of a string, which leads to some unexpected behavior. If the
version is specified as `version: 13.0`, YAML will interpet `13.0` as a
floating point number, drop the fraction part (because `13` and `13.0` are the
same) and the GitHub action will only see `13` instead of `13.0`. The solution
is to explicitly state that a string is required by using quotes: `version:
'13.0'`.

## `Supported Platforms`

This sections lists the currently supported platforms by operating system. Each
operating system will list which versions are supported.

### [OpenBSD][openbsd_builder] (`openbsd`)

| Version | x86-64 | arm64  |
| ------- | ------ | ------ |
| 7.3     | ✅     | ✅     |
| 7.2     | ✅     | ✅     |
| 7.1     | ✅     | ✅     |
| 6.9     | ✅     | ✅     |
| 6.8     | ✅     | ❌     |

### [FreeBSD][freebsd_builder] (`freebsd`)

| Version | x86-64 |
| ------- | ------ |
| 13.2    | ✅     |
| 13.1    | ✅     |
| 13.0    | ✅     |
| 12.4    | ✅     |
| 12.2    | ✅     |

### [NetBSD][netbsd_builder] (`netbsd`)

| Version | x86-64 |
| ------- | ------ |
| 9.3     | ✅     |
| 9.2     | ✅     |

### Hypervisors

This section lists the available hypervisors, which platforms they can run and
which runners they can run on.

| Hypervisor | Linux Runner | macOS Runner | FreeBSD | OpenBSD | Other Platforms |
|------------|--------------|--------------|---------|---------|-----------------|
| `xhyve`    | ❌           | ✅          | ✅      | ✅      | ❌              |
| `qemu`     | ✅           | ✅          | ✅      | ✅      | ✅              |

### Runners

This section lists the different combinations of platforms and on which runners
they can run.

| Runner                                        | OpenBSD | FreeBSD | NetBSD |
| ----------------------------------------------| ------- | ------- | ------ |
| **Linux**                                     | ✅      | ✅      | ✅     |
| **macos-10.15**, **macos-11**, **macos-12**   | ✅      | ✅      | ✅     |

## `Under the Hood`

GitHub Actions currently only support macOS, Linux, and
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
action is run. The public key is added to the VM image and the host stores the private key.
Since xhyve does not support file sharing, a secondary hard
drive, which is backed by a file, is created. The public key is stored on this
hard drive, which the VM then mounts. At boot time, the secondary hard
drive will be identified and the public key will be copied to the appropriate
location.

To reduce the time it takes for the GitHub action to start executing the
commands specified by the user, it aims to boot the guest operating systems as
fast as possible. This is achieved in a couple of ways:

- By downloading [resources][resources], like the hypervisor and a few other
  tools, instead of installing them through a package manager

- The resources that are downloaded use no compression. The size is
  small enough anyway and it's faster to download the uncompressed data than
  it is to download compressed data and then uncompress it.

- It leverages `async`/`await` to perform tasks asynchronously. Like
  downloading the VM image and other resources at the same time

- It performs as much as possible of the setup ahead of time when the VM image
  is provisioned

## `Local Development`

### Prerequisites

* [NodeJS](https://nodejs.org)
* [npm](https://github.com/npm/cli)
* [git](https://git-scm.com)

### Instructions

1. Install the above prerequisites
1. Clone the repository by running:

    ```
    git clone https://github.com/cross-platform-actions/action
    ```

1. Navigate to the newly cloned repository: `cd action`
1. Install the dependencies by running: `npm install`
1. Run any of the below npm commands

### npm Commands

The following npm commands are available:

* `build` - Build the GitHub action
* `format` - Reformat the code
* `lint` - Lint the code
* `package` - Package the GitHub action for distribution and end to end testing
* `test` - Run unit tests
* `all` - Will run all of the above commands

### Running End to End Tests

The end to end tests can be run locally by running it through [Act][act]. By
default, resources and VM images will be downloaded from github.com. By running
a local HTTP server it's possible to point the GitHub action to local resources.

#### Prerequisites

* [Docker](https://docker.com)
* [Act][act]

#### Instructions

1. Install the above prerequisites
1. Copy [`test/workflows/ci.yml.example`](test/workflows/ci.yml.example) to
    `test/workflows/ci.yml`

1. Make any changes you like to `test/workflows/ci.yml`, this is file ignored by
    Git

1. Build the GitHub action by running: `npm run build`
1. Package the GitHub action by running: `npm run package`
1. Run the GitHub action by running: `act --privileged -W test/workflows`

#### Providing Resources Locally

The GitHub action includes a development dependency on a HTTP server. The
[`test/http`](test/http) directory contains a skeleton of a directory structure
which matches the URLs that the GitHub action uses to download resources. All
files within the [`test/http`](test/http) are ignore by Git.

1. Add resources as necessary to the [`test/http`](test/http) directory
1. In one shell, run the following command to start the HTTP server:

    ```
    ./node_modules/http-server/bin/http-server test/http -a 127.0.0.1
    ```

    The `-a` flag configures the HTTP server to only listen for incoming
    connections from localhost, no external computers will be able to connect.

1. In another shell, run the GitHub action by running:

    ```
    act --privileged -W test/workflows --env CPA_RESOURCE_URL=<url>
    ```

    Where `<url>` is the URL inside Docker that points to localhost of the host
    machine, for macOS, this is `http://host.docker.internal:8080`. By default,
    the HTTP server is listening on port `8080`.

[xhyve]: https://github.com/machyve/xhyve
[qemu]: https://www.qemu.org
[hypervisor_framework]: https://developer.apple.com/library/mac/documentation/DriversKernelHardware/Reference/Hypervisor/index.html
[rsync]: https://en.wikipedia.org/wiki/Rsync
[resources]: https://github.com/cross-platform-actions/resources
[packer]: https://www.packer.io
[openbsd_builder]: https://github.com/cross-platform-actions/openbsd-builder
[freebsd_builder]: https://github.com/cross-platform-actions/freebsd-builder
[netbsd_builder]: https://github.com/cross-platform-actions/netbsd-builder
[act]: https://github.com/nektos/act
