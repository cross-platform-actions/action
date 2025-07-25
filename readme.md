# Cross-Platform GitHub Action

This project provides a GitHub action for running GitHub Actions workflows on
multiple platforms, including platforms that GitHub Actions doesn't currently natively support.

## `Features`

Some of the features that this action supports include:

- Multiple operating systems with one single action
- Multiple versions of each operating system
- Non-x86_64 architectures
- Allows to use default shell or Bash shell
- Low boot overhead
- Fast execution
- Using the action in multiple steps in the same job

## `Usage`

### Minimal Example

Here's a sample workflow file which will run the given commands on FreeBSD 14.0.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test
        uses: cross-platform-actions/action@v0.26.0
        with:
          operating_system: freebsd
          version: '14.2'
          run: |
            uname -a
            echo $SHELL
            pwd
            ls -lah
            whoami
            env | sort
```

### Full Example

Here's a sample workflow file which will set up a matrix resulting in four
jobs. One which will run on FreeBSD 14.3, one which runs OpenBSD 7.7, one which
runs NetBSD 10.0, one which runs OpenBSD 7.7 on ARM64, one which runs NetBSD
10.1 on ARM64 and one which runs Haiku R1/beta5 on x86-64.

```yaml
name: CI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        os:
          - name: freebsd
            architecture: x86-64
            version: '14.3'

          - name: openbsd
            architecture: x86-64
            version: '7.7'

          - name: openbsd
            architecture: arm64
            version: '7.7'

          - name: netbsd
            architecture: x86-64
            version: '10.1'

          - name: netbsd
            architecture: arm64
            version: '10.1'

          - name: haiku
            architecture: x86-64
            version: 'r1beta5'

    steps:
      - uses: actions/checkout@v4

      - name: Test on ${{ matrix.os.name }}
        uses: cross-platform-actions/action@v0.27.0
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

| Input                   | Required | Default Value     | Type    | Description                                                                                                                                                                                                                                                  |
|-------------------------|----------|-------------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `run`                   | ✅       | ❌                | string  | Runs command-line programs using the operating system's shell. This will be executed inside the virtual machine.                                                                                                                                             |
| `operating_system`      | ✅       | ❌                | string  | The type of operating system to run the job on. See [Supported Platforms](#supported-platforms).                                                                                                                                                             |
| `architecture`          | ❌       | `x86-64`          | string  | The architecture of the operating system. See [Supported Platforms](#supported-platforms).                                                                                                                                                                   |
| `version`               | ✅       | ❌                | string  | The version of the operating system to use. See [Supported Platforms](#supported-platforms).                                                                                                                                                                 |
| `shell`                 | ❌       | `default`         | string  | The shell to use to execute the commands. Defaults to the default shell for the given operating system. Allowed values are: `default`, `sh` and `bash`                                                                                                       |
| `environment_variables` | ❌       | `""`              | string  | A list of environment variables to forward to the virtual machine. The list should be separated with spaces. The `CI` and any environment variables starting with `GITHUB_` are forwarded automatically.                                                     |
| `memory`                | ❌       | `6G`              | string  | The amount of memory for the virtual machine.                                                                                                                                                                                                                |
| `cpu_count`             | ❌       | `2`               | integer | The number of CPU cores for the virtual machine.                                                                                                                                                                                                             |
| `image_url`             | ❌       | ❌                | string  | URL a custom VM image that should be used in place of the default ones.                                                                                                                                                                                      |
| `sync_files`            | ❌       | `true`            | string  | Specifies if the local files should be synchronized to the virtual machine and in which direction. Valid values are `true`, `false`, `runner-to-vm` and `vm-to-runner`. `true` synchronizes files in both directions. `false` disables file synchronization. |
| `shutdown_vm`           | ❌       | `true`            | boolean | Specifies if the VM should be shutdown after the action has been run.                                                                                                                                                                                        |

All inputs are expected to be of the specified type. It's especially important
that you specify `version` as a string, using single or
double quotes. Otherwise YAML might interpet the value as a numeric value
instead of a string, which leads to some unexpected behavior. If the
version is specified as `version: 13.0`, YAML will interpet `13.0` as a
floating point number, drop the fraction part (because `13` and `13.0` are the
same) and the GitHub action will only see `13` instead of `13.0`. The solution
is to explicitly state that a string is required by using quotes: `version:
'13.0'`.

#### Custom VM Image (`image_url`)

With the `image_url` input it's possible to specify a custom virtual machine
image. The main reason for this feature is to do additional custom
provisioning, like installing additional packages. This allows to pre-install
everything that is needed for a CI job beforhand, which can save time later
when the job is run.

Only existing operating systems, architectures and versions are supported.

##### Building a Custom VM Image

1. Fork one of the existing [*builder repositories ](https://github.com/cross-platform-actions/?q=builder)
1. Add the additional provisioning to the `resources/custom.sh` script. Don't
    remove any existing provisioning scripts.
1. Adjust the CI workflow to remove any unwanted architectures or versions
1. Create and push a new tag
1. This will launch the CI workflow, build the image(s) and create a draft
    GitHub release. The VM image(s) are automatically attached to the release
1. Edit the release to publish it
1. Copy the URL for the VM image
1. Use the URL with the `image_url` input

## `Supported Platforms`

This sections lists the currently supported platforms by operating system. Each
operating system will list which versions are supported.

### [OpenBSD][openbsd_builder] (`openbsd`)

| Version | x86-64 | arm64  |
| ------- | ------ | ------ |
| 7.7     | ✅     | ✅     |
| 7.6     | ✅     | ✅     |
| 7.5     | ✅     | ✅     |
| 7.4     | ✅     | ✅     |
| 7.3     | ✅     | ✅     |
| 7.2     | ✅     | ✅     |
| 7.1     | ✅     | ✅     |
| 6.9     | ✅     | ✅     |
| 6.8     | ✅     | ❌     |

### [FreeBSD][freebsd_builder] (`freebsd`)

| Version | x86-64 | arm64  |
| ------- | ------ | ------ |
| 14.3    | ✅     | ✅     |
| 14.2    | ✅     | ✅     |
| 14.1    | ✅     | ✅     |
| 14.0    | ✅     | ✅     |
| 13.5    | ✅     | ✅     |
| 13.4    | ✅     | ✅     |
| 13.3    | ✅     | ✅     |
| 13.2    | ✅     | ✅     |
| 13.1    | ✅     | ✅     |
| 13.0    | ✅     | ✅     |
| 12.4    | ✅     | ✅     |
| 12.2    | ✅     | ❌     |

### [NetBSD][netbsd_builder] (`netbsd`)

| Version | x86-64 | arm64 |
|---------|--------|-------|
| 10.1    | ✅     | ✅    |
| 10.0    | ✅     | ✅    |
| 9.4     | ✅     | ❌    |
| 9.3     | ✅     | ❌    |
| 9.2     | ✅     | ❌    |

### [Haiku][haiku_builder] (`haiku`)

Note, Haiku is a single user system. That means the user that runs the the job
is the default (and only) user, `user`, instead of `runner`, as for the other
operating systems.

| Version | x86-64 |
|---------|--------|
| r1beta5 | ✅     |

### Architectures

This section lists the supported architectures and any aliases. All the names
are case insensitive. For a combination of supported architectures and
operating systems, see the sections for each operating system above.

| Architecture | Aliases         |
|--------------|-----------------|
| `arm64`      | `aarch64`       |
| `x86-64`     | `x86_64`, `x64` |
|              |                 |

### Hypervisors

This section lists the available hypervisors, which platforms they can run and
which runners they can run on.

| Hypervisor | Linux Runner | FreeBSD | OpenBSD | Other Platforms |
|------------|--------------|---------|---------|-----------------|
| `qemu`     | ✅           | ✅      | ✅      | ✅             |

### Runners

This section lists the different combinations of platforms and on which runners
they can run.

| Runner                                        | OpenBSD | FreeBSD | NetBSD | ARM64 |
| ----------------------------------------------| ------- | ------- | ------ | ----- |
| **Linux**                                     | ✅      | ✅      | ✅     | ✅   |

## `Linux on Non-x86 Architectures`

There are currently no plans to add support for Linux. Instead it's very easy
to support Linux on non-x86 architectures using the QEMU support in Docker with the
[docker/setup-qemu-action](https://github.com/docker/setup-qemu-action) action:

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
  with:
    platforms: linux/riscv64

- name: Run Command in Docker
  run: |
    docker run \
      --rm \
      -v $(pwd):/${{ github.workspace }} \
      -w ${{ github.workspace }} \
      --platform linux/riscv64 \
      debian:unstable-slim \
      <command to run>
```

For those not familiar with Docker, here's an explanation of the above command:

* `run` - Runs a Docker container
* `--rm` - Removes the container after it exits
* `-v` - Mounts a local directory into the container. In this case the current
    directory is mounted to the same path in the container
* `-w` - Specifies the working directory inside the container
* `--platform` - Specifies the platform/architecture
* `debian:unstable-slim` - Specifies with image to create the container from.
    Basically the Linux distribution to use
* `<command to run>` - The command you want to run inside the container

## `Common Issues`

### FreeBSD Operating System Version Mismatch

#### Issue

When installing packages on FreeBSD you might see an error related to
mismatching of operating system or kernel version. This occurs because FreeBSD
only supports one minor version of the previous major version. Therefore
FreeBSD only has one package repository for each **major** version, not each
**minor** version. When a new minor version is released, all packages in the
repository are rebuilt targeting this new minor version. If you're on an older
minor version of the operating system the package manager will give you an
error.

For more information, see: https://www.freebsd.org/security/#sup and
https://www.freebsd.org/releases.

#### Solution

##### Alternative 1

The best solution is to upgrade to the latest supported minor version.

##### Alternative 2

If Alternative 1 is not possible, you can ignore the operating system version
mismatch by setting the `IGNORE_OSVERSION` environment variable with the value
`yes`. Ignoring the operating system version mismatch can lead to runtime
issues if the package depends on features or libraries only present in the
newer operating system version. Example:

```
env IGNORE_OSVERSION=yes pkg install <package>
```

Where `<package>` is the name of the package to install.

## `Under the Hood`

GitHub Actions currently only support macOS, Linux, and Windows. To be able to
run other platforms, this GitHub action runs the commands inside a virtual
machine (VM). If the host platform is macOS or Linux the hypervisor can take
advantage of nested virtualization.

All platforms run on the [QEMU][qemu] hypervisor. QEMU is a general purpose
hypervisor and emulator that runs on most host platforms and supports most
guest systems.

The VM images running inside the hypervisor are built using [Packer][packer].
It's a tool for automatically creating VM images, installing the guest
operating system and doing any final provisioning.

The GitHub action uses SSH to communicate and execute commands inside the VM.
It uses [rsync][rsync] to share files between the guest VM and the host. To
authenticate the SSH connection a unique key pair is used. This pair is
generated each time the action is run. The public key is added to the VM image
and the host stores the private key. A secondary hard drive, which is backed by
a file, is created. The public key is stored on this hard drive, which the VM
then mounts. At boot time, the secondary hard drive will be identified and the
public key will be copied to the appropriate location.

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

## `Contributing`

### Changelog

The changelog is maintained in the [changelog.md](changelog.md) file, following
the [Keep a Changelog] format. The changelog is updated incrementally. That is,
for every new feature or bugfix, add an entry to the changelog. New entries are
added below the [Unreleased] section, with an appropriate sub header.

### Supporting a New Operating System Version

To add support for a new version of an existing operating system follow the
steps below:

#### In The *-builder` Repository

First, make the necessary changes in the appropriate [*-builder repository](https://github.com/orgs/cross-platform-actions/repositories?type=source&q=builder):

1. Add a new subdirectory under the `var_files` directory
1. Name the subdirectory after the new version, i.e. `14.3`
1. Add a `.pkrvars.hcl` file for each supported architecture
1. The content of the above files should be:

    ```hcl
    checksum = "<hash>"
    ```

    Where `<hash>` should be replaced with the hash of the install media. Make
    sure the hash value is prefixed with the hashing algorithm, example:

    ```hcl
    checksum = "sha256:1c41fdca8fcd8c746eb05f31a82a4bff2ad866c5fde1808f16b822a6df3f0de5"
    ```

    The hash of the install media can usually be found at a nearby URL where the
    install media is downloaded from. Exactly where to find this depends on the
    operating system. The URL for the install media can be found the main Packer
    configuration file in the `*-builder` repository.'

1. Add a new entry to the table in the readme containing supported versions and
    architectures.

1. Update the GitHub Action workflow with a new entry in the existing matrix of
    versions.

1. If there's a changelog file, update that as well
1. Create a pull request with the changes

##### By a Maintainer

1. Push a new tag to create a draft release
1. Publish the release

#### In the Action Repository

1. Update the [`src/version.ts`](src/version.ts) file with the new tag from the previous step
1. Compile the TypeScript by running `npm run all`

1. Update the [`.github/workflows/ci.yml`](.github/workflows/ci.yml) file by adding the new version to the existing
    matrix of versions of the operating system

1. Update the [`readme.md`](readme.md) file and add new entry in the version and
    architecture table of the operating system in the
    [`Supported Platforms`](https://github.com/cross-platform-actions/action#supported-platforms)
    section

1. If the new version is the latest version available of the operating system,
    update [`Full Example`](https://github.com/cross-platform-actions/action#full-example)
    section in the [`readme.md`](readme.md), both the description and the
    example usage of the GitHub action

1. Update the changelog: [`changelog.md`](changelog.md)

1. Create a pull request with all the changes

### Creating a Release

For creating a new release, follow the steps below.

#### Decide Version Number

Decide what the next version number should be. Cross-Platform Action follows
the [semantic versioning scheme][semver]. In a version number like: `2.1.1`, the
digits are divided as follows:

```
  2.    1.    1
  ^     ^     ^
  |     |     |
  |     |     |
major minor patch
```

To decide what the next version should be, this is fairly straightforward. Look
at current version number, then look at the [Unreleased] section of the
changelog:

1. If the section only contains a `Fixed` sub header, then increment the patch
    digit

1. If the section contains an `Added`, `Changed` or `Deprecated` sub headers,
    then increment the minor digit

1. If the section contains a `Removed` sub header, increment the major digit

#### Update the Changelog

1. Rename the [Unreleased] section to match the version that is being released
1. Add the current date in the section from previous step. See existing entries
1. Add a new section for the `Unreleased` section at the top
1. Add a new reference link for the new section at the bottom of the changelog
1. Update the `Unreleased` reference link at the bottom of the changelog

#### Creating the Release

These steps need to be performed by a maintainer.

1. Create a new annotated Git tag with the version of the release, prefixed with `v`,
    i.e. `v2.0.0`. See existing tags, i.e. `git show v0.29.0`.

1. Push the tag. Pushing the tag will automatically trigger a CI workflow that
    creates a new draft release. It will copy the content of the newly added
    section in the changelog and use that as the release notes.

1. Check the release at GitHub to make sure everything looks good. Publish the
    relese.

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

[qemu]: https://www.qemu.org
[rsync]: https://en.wikipedia.org/wiki/Rsync
[resources]: https://github.com/cross-platform-actions/resources
[packer]: https://www.packer.io
[openbsd_builder]: https://github.com/cross-platform-actions/openbsd-builder
[freebsd_builder]: https://github.com/cross-platform-actions/freebsd-builder
[netbsd_builder]: https://github.com/cross-platform-actions/netbsd-builder
[haiku_builder]: https://github.com/cross-platform-actions/haiku-builder
[act]: https://github.com/nektos/act
[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Unreleased]: #unreleased
[semver]: https://semver.org
