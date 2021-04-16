# Cross-Platform GitHub Action

This project provides a GitHub action for running GitHub Action workflows on
multiple platforms. This includes platforms that GitHub Actions doesn't
currently natively support.

## Features

Some of the features that are supported include:

* Multiple operating system with one single action
* Multiple versions of each operating system
* Allows to use default shell or Bash shell
* Low boot overhead
* Fast execution

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

The jobs need to run on: `macos-10.15`.

### Inputs

This section lists the available inputs for the action.

| Input                   | Required | Default Value | Description                                                                                                                                            |
|-------------------------|----------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `run`                   | ✓        | ✗             | Runs command-line programs using the operating system's shell. This will be executed inside the virtual machine.                                       |
| `operating_system`      | ✓        | ✗             | The type of operating system to run the job on. See (Supported Platforms)[#supported-platforms].                                                       |
| `version`               | ✓        | ✗             | The version of the operating system to use. See (Supported Platforms)[#supported-platforms].                                                           |
| `shell`                 | ✗        | `default`     | The shell to use to execute the commands. Defaults to the default shell for the given operating system. Allowed values are: `default`, `sh` and `bash` |
| `environment_variables` | ✗        | `""`          | A list of environment variables to forward to the virtual machine. The list should be separated with spaces.                                           |

## Supported Platforms

This sections lists the currently supported platforms by operating system. Each
operating system will list which versions are supported.

### OpenBSD

| Version | x86-64 |
|---------|--------|
| 6.8     | ✓      |

### FreeBSD

| Version | x86-64 |
|---------|--------|
| 12.2    | ✓      |
