import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

import * as cache from '@actions/tool-cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from '../architecture'
import * as hostModule from '../host'
import * as os from '../operating_system'
import * as os_factory from '../operating_systems/factory'
import ResourceDisk from '../resource_disk'
import * as vmModule from '../vm'
import {
  DefaultVmFileSystemSynchronizer,
  commandToShellString
} from '../vm_file_system_synchronizer'
import * as input from './input'
import * as shell from './shell'
import * as utility from '../utility'

import {execSync} from 'child_process'

export class Action {
  readonly tempPath: string
  readonly host: hostModule.Host
  readonly operatingSystem: os.OperatingSystem
  readonly inputHashPath = '/tmp/cross-platform-actions-input-hash'
  readonly input = new input.Input()

  private readonly cpaHost: string
  private readonly resourceDisk: ResourceDisk
  private readonly sshDirectory: string
  private readonly privateSshKey: fs.PathLike
  private readonly publicSshKey: fs.PathLike
  private readonly privateSshKeyName = 'id_ed25519'
  private readonly targetDiskName = 'disk.raw'

  constructor() {
    this.cpaHost = vmModule.Vm.cpaHost
    this.host = hostModule.Host.create()
    this.tempPath = fs.mkdtempSync('/tmp/resources')
    const arch = architecture.Architecture.for(
      this.input.architecture,
      this.host,
      this.input.operatingSystem,
      this.input.hypervisor
    )

    this.operatingSystem = this.createOperatingSystem(arch)
    this.resourceDisk = ResourceDisk.for(this)

    this.sshDirectory = path.join(this.getHomeDirectory(), '.ssh')
    this.privateSshKey = path.join(this.tempPath, this.privateSshKeyName)
    this.publicSshKey = `${this.privateSshKey}.pub`
  }

  async run(): Promise<void> {
    core.startGroup('Setting up VM')
    core.debug('Running action')
    const runPreparer = this.createRunPreparer()
    runPreparer.createInputHash()
    runPreparer.validateInputHash()

    const [diskImagePath, hypervisorArchivePath, resourcesArchivePath] =
      await Promise.all([...runPreparer.download(), runPreparer.setupSSHKey()])

    const [firmwareDirectory, resourcesDirectory] = await Promise.all(
      runPreparer.unarchive(hypervisorArchivePath, resourcesArchivePath)
    )

    const hypervisorDirectory = path.join(firmwareDirectory, 'bin')
    const excludes = [
      resourcesArchivePath,
      resourcesDirectory,
      hypervisorArchivePath,
      hypervisorDirectory,
      firmwareDirectory,
      diskImagePath
    ].map(p => p.slice(this.homeDirectory.length + 1))

    const vm = this.createVm(
      hypervisorDirectory,
      firmwareDirectory,
      resourcesDirectory,
      {
        memory: this.input.memory,
        cpuCount: this.input.cpuCount
      }
    )

    const implementation = this.getImplementation(vm)
    await implementation.prepareDisk(diskImagePath, resourcesDirectory)

    await implementation.init()
    try {
      await implementation.run()
      implementation.configSSH(vm.ipAddress)
      await implementation.wait(240)
      await implementation.setupWorkDirectory(
        vm.homeDirectory,
        vm.workDirectory
      )
      const syncExcludes = [
        this.targetDiskName,
        this.resourceDisk.diskPath,
        ...excludes
      ]
      await vm.synchronizePaths(...syncExcludes)
      implementation.setupCustomShell(syncExcludes)
      core.info('VM is ready')
      try {
        core.endGroup()
        await this.runCommand(vm)
      } finally {
        core.startGroup('Tearing down VM')
        await vm.synchronizeBack()
      }
    } finally {
      try {
        if (this.input.shutdownVm) {
          await vm.terminate()
        }
      } finally {
        core.endGroup()
      }
    }
  }

  async downloadDiskImage(): Promise<string> {
    const imageURL =
      this.input.imageURL !== ''
        ? this.input.imageURL
        : this.operatingSystem.virtualMachineImageUrl
    core.info(`Downloading disk image: ${imageURL}`)
    const result = await cache.downloadTool(imageURL)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  async download(type: string, url: string): Promise<string> {
    core.info(`Downloading ${type}: ${url}`)
    const result = await cache.downloadTool(url)
    core.info(`Downloaded file: ${result}`)

    return result
  }

  createVm(
    hypervisorDirectory: string,
    firmwareDirectory: string,
    resourcesDirectory: string,
    config: os.ExternalVmConfiguration
  ): vmModule.Vm {
    return this.operatingSystem.createVirtualMachine(
      hypervisorDirectory,
      resourcesDirectory,
      firmwareDirectory,
      this.input,
      {
        ...config,
        diskImage: path.join(resourcesDirectory, this.targetDiskName),
        resourcesDiskImage: this.resourceDisk.diskPath
      }
    )
  }

  async unarchive(type: string, archivePath: string): Promise<string> {
    core.info(`Unarchiving ${type}: ${archivePath}`)
    return cache.extractTar(archivePath, undefined, '-x')
  }

  async unarchiveHypervisor(archivePath: string): Promise<string> {
    const hypervisorDirectory = await this.unarchive('hypervisor', archivePath)
    return path.join(hypervisorDirectory)
  }

  private get customSendEnv(): string {
    const env = this.input.environmentVariables
    return env ? `SendEnv ${env}` : ''
  }

  private async setupSSHKey(): Promise<void> {
    const mountPath = this.resourceDisk.create()
    await exec.exec('ssh-keygen', [
      '-t',
      'ed25519',
      '-f',
      this.privateSshKey.toString(),
      '-q',
      '-N',
      ''
    ])
    fs.copyFileSync(this.publicSshKey, path.join(await mountPath, 'keys'))
    this.resourceDisk.unmount()
  }

  private get homeDirectory(): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const workDirectory = process.env['GITHUB_WORKSPACE']!
    const components = workDirectory.split(path.sep).slice(0, -2)
    return path.join('/', ...components)
  }

  private async runCommand(vm: vmModule.Vm): Promise<void> {
    if (this.input.run === '') return

    utility.group('Running command', () => core.info(this.input.run))

    const sh =
      this.input.shell === shell.Shell.default
        ? '$SHELL'
        : shell.toString(this.input.shell)
    await vm.execute2(
      ['sh', '-c', `'cd "${vm.workDirectory}" && exec "${sh}" -e'`],
      Buffer.from(this.input.run)
    )
  }

  private getHomeDirectory(): string {
    const homeDirectory = process.env['HOME']

    if (homeDirectory === undefined)
      throw Error('Failed to get the home direcory')

    return homeDirectory
  }

  private createOperatingSystem(
    arch: architecture.Architecture
  ): os.OperatingSystem {
    return os_factory.Factory.for(this.input.operatingSystem, arch).create(
      this.input.version,
      this.input.hypervisor
    )
  }

  private getImplementation(vm: vmModule.Vm): Implementation {
    const cls = implementationFor({isRunning: vmModule.Vm.isRunning})
    core.debug(`Using action implementation: ${cls.name}`)
    return new cls(this, vm, this.homeDirectory)
  }

  private createRunPreparer(): RunPreparer {
    const cls = runPreparerFor({isRunning: vmModule.Vm.isRunning})
    core.debug(`Using run preparer: ${cls.name}`)
    return new cls(this, this.operatingSystem)
  }
}

function implementationFor({
  isRunning
}: {
  isRunning: boolean
}): utility.Class<Implementation> {
  return isRunning ? LiveImplementation : InitialImplementation
}

function runPreparerFor({
  isRunning
}: {
  isRunning: boolean
}): utility.Class<RunPreparer> {
  return isRunning ? LiveRunPreparer : InitialRunPreparer
}

interface RunPreparer {
  createInputHash(): void
  validateInputHash(): void
  download(): [Promise<string>, Promise<string>, Promise<string>]
  setupSSHKey(): Promise<void>
  unarchive(
    hypervisorArchivePath: string,
    resourcesArchivePath: string
  ): [Promise<string>, Promise<string>]
}

// Used when the VM is not running
class InitialRunPreparer implements RunPreparer {
  private readonly action: Action
  private readonly operatingSystem: os.OperatingSystem

  constructor(action: Action, operatingSystem: os.OperatingSystem) {
    this.action = action
    this.operatingSystem = operatingSystem
  }

  createInputHash(): void {
    const hash = this.action['input'].toHash()
    core.debug(`Input hash: ${hash}`)
    fs.writeFileSync(this.action.inputHashPath, hash)
  }

  validateInputHash(): void {
    // noop
  }

  download(): [Promise<string>, Promise<string>, Promise<string>] {
    return [
      this.action.downloadDiskImage(),
      this.action.download('hypervisor', this.operatingSystem.hypervisorUrl),
      this.action.download('resources', this.operatingSystem.resourcesUrl)
    ]
  }

  async setupSSHKey(): Promise<void> {
    await this.action['setupSSHKey']()
  }

  unarchive(
    hypervisorArchivePath: string,
    resourcesArchivePath: string
  ): [Promise<string>, Promise<string>] {
    return [
      this.action.unarchiveHypervisor(hypervisorArchivePath),
      this.action.unarchive('resources', resourcesArchivePath)
    ]
  }
}

// Used when the VM is already running
class LiveRunPreparer implements RunPreparer {
  private readonly action: Action

  constructor(action: Action) {
    this.action = action
  }

  createInputHash(): void {
    // noop
  }

  validateInputHash(): void {
    const hash = this.action.input.toHash()
    core.debug(`Input hash: ${hash}`)
    const initialHash = fs.readFileSync(this.action.inputHashPath, 'utf8')

    if (hash !== initialHash)
      throw Error("The inputs don't match the initial invocation of the action")
  }

  download(): [Promise<string>, Promise<string>, Promise<string>] {
    return [Promise.resolve(''), Promise.resolve(''), Promise.resolve('')]
  }

  async setupSSHKey(): Promise<void> {
    // noop
  }

  unarchive(): [Promise<string>, Promise<string>] {
    return [Promise.resolve(''), Promise.resolve('')]
  }
}

interface Implementation {
  prepareDisk(diskImagePath: string, resourcesDirectory: string): Promise<void>
  init(): Promise<void>
  run(): Promise<void>
  wait(timeout: number): Promise<void>

  setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void>

  configSSH(ipAddress: string): void
  setupCustomShell(syncExcludes: string[]): void
}

class LiveImplementation implements Implementation {
  async prepareDisk(
    _diskImagePath: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _resourcesDirectory: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // noop
  }

  async init(): Promise<void> {
    // noop
  }

  async run(): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async wait(_timeout: number): Promise<void> {
    // noop
  }

  async setupWorkDirectory(
    _homeDirectory: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _workDirectory: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configSSH(_ipAddress: string): void {
    // noop
  }

  setupCustomShell(
    _syncExcludes: string[] // eslint-disable-line @typescript-eslint/no-unused-vars
  ): void {
    // noop
  }
}

class InitialImplementation implements Implementation {
  private readonly action: Action
  private readonly vm: vmModule.Vm

  constructor(
    action: Action,
    vm: vmModule.Vm,
    _homeDirectory: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    this.action = action
    this.vm = vm
  }

  async prepareDisk(
    diskImagePath: string,
    resourcesDirectory: string
  ): Promise<void> {
    await this.action.operatingSystem.prepareDisk(
      diskImagePath,
      this.targetDiskName,
      resourcesDirectory
    )
  }

  async init(): Promise<void> {
    await this.vm.init()
  }

  async run(): Promise<void> {
    await this.vm.run()
  }

  async wait(timeout: number): Promise<void> {
    await this.vm.wait(timeout)
  }

  async setupWorkDirectory(
    homeDirectory: string,
    workDirectory: string
  ): Promise<void> {
    await this.vm.setupWorkDirectory(homeDirectory, workDirectory)
  }

  private get targetDiskName(): string {
    return this.action['targetDiskName']
  }

  configSSH(ipAddress: string): void {
    core.debug('Configuring SSH')

    this.createSSHConfig()
    this.setupAuthorizedKeys()
    this.setupHostname(ipAddress)
  }

  setupCustomShell(syncExcludes: string[]): void {
    const cpaShellDirectory = fs.mkdtempSync('/tmp/cpa-shell-')
    const cpaShellPath = path.join(cpaShellDirectory, 'cpa.sh')

    const sh =
      this.action.input.shell === shell.Shell.default
        ? '\\$SHELL'
        : shell.toString(this.action.input.shell)

    const sshTarget = `${this.vm.user}@${vmModule.Vm.cpaHost}`
    const workDir = escapeForSh(this.vm.workDirectory)
    const rebootCommand = this.operatingSystem.rebootCommand

    const synchronizer = new DefaultVmFileSystemSynchronizer({
      input: this.action.input,
      user: this.vm.user,
      guestHomeDirectory: this.vm.homeDirectory,
      hostHomeDirectory: this.vm.hostHomeDirectory
    })
    const toVm = commandToShellString(
      synchronizer.synchronizePathsCommand(...syncExcludes)
    )
    const toRunner = commandToShellString(synchronizer.synchronizeBackCommand())

    const postSyncToVm = this.vm.postSyncToVmCommand
    const postSyncToVmLine = postSyncToVm
      ? `ssh -t ${sshTarget} ${escapeForSh(postSyncToVm)}`
      : ''

    const script = `#!/usr/bin/env sh
set -eu

usage() {
  cat >&2 <<'EOF'
Usage:
  cpa.sh FILE [POST_FLAGS]          Run FILE inside the VM (used as the custom shell)
  cpa.sh --sync-files [DIRECTION]   Synchronize files between the runner and the VM
                                    (both [default], none, runner-to-vm, vm-to-runner)
  cpa.sh --reboot                   Reboot the VM and wait until it's reachable again

When FILE is given, files are synchronized automatically: runner-to-vm before
the file is executed, and vm-to-runner after. Pass --sync-files DIRECTION as a
POST_FLAG to change this (use 'none' to skip syncing entirely). --reboot can
also be used as a POST_FLAG to reboot after the file has run.

Available POST_FLAGS for FILE mode:
  --env-vars "VAR1 VAR2 CYPRESS_*"  Space-separated environment variables to pass into the VM
  --sync-files DIRECTION            Control file synchronization behavior
  --reboot                          Reboot the VM after file execution
EOF
  exit 2
}

sync_to_vm() {
  ${toVm}
  ${postSyncToVmLine}
}

sync_to_runner() {
  ${toRunner}
}

do_sync() {
  direction="\${1:-both}"
  case "$direction" in
    both)
      sync_to_vm
      sync_to_runner
      ;;
    none)
      echo "Sync skipped."
      return 0
      ;;
    runner-to-vm)
      sync_to_vm
      ;;
    vm-to-runner)
      sync_to_runner
      ;;
    *)
      echo "Invalid sync direction: $direction" >&2
      echo "Valid values are: both, none, runner-to-vm, vm-to-runner" >&2
      exit 1
      ;;
  esac
  echo "Sync complete."
}

do_reboot() {
  echo "Rebooting VM..."
  ssh -t ${sshTarget} '${rebootCommand}' || true

  echo "Waiting for VM to come back up..."
  deadline=$(($(date +%s) + 240))
  consecutive=0
  while [ "$consecutive" -lt 3 ]; do
    if ssh -t -o ConnectTimeout=2 ${sshTarget} true 2>/dev/null; then
      consecutive=$((consecutive + 1))
    else
      consecutive=0
      if [ "$(date +%s)" -ge "$deadline" ]; then
        echo "Timed out waiting for VM to come back up after 240s" >&2
        exit 1
      fi
    fi
    sleep 1
  done
  echo "VM is ready."
}

run_file_in_vm() {
  step_script_path="$1"
  env_vars="$2"
  {
    python3 -c '
import sys, os, shlex, fnmatch
patterns = sys.argv[1].split() if sys.argv[1] else []
for k, v in os.environ.items():
    matched = any(fnmatch.fnmatchcase(k, pat) for pat in patterns)
    if matched:
        print(f"export {k}={shlex.quote(v)}")
' "$env_vars"
    cat "$step_script_path"
  } | ssh -t "${sshTarget}" "mkdir -p '${workDir}' && cd '${workDir}' && exec "${sh}" -e"
}

if [ $# -eq 0 ]; then
  usage
fi

run_file=""
case "$1" in
  --*) ;;
  *)
    run_file="$1"
    shift
    ;;
esac

if [ -z "$run_file" ]; then
  # Standalone mode: each flag is a discrete operation, applied in order.
  while [ $# -gt 0 ]; do
    case "$1" in
      --reboot)
        do_reboot
        shift
        ;;
      --sync-files)
        shift
        case "\${1-}" in
          --*|"")
            do_sync ""
            ;;
          *)
            do_sync "$1"
            shift
            ;;
        esac
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage
        ;;
    esac
  done
else
  # File mode: --sync-files DIRECTION wraps the file run (default both),
  # --reboot runs after the post-sync, and --env-vars passes environments variables.
  sync_dir="both"
  reboot_after=false
  env_vars=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --reboot)
        reboot_after=true
        shift
        ;;
      --env-vars)
        shift
        if [ $# -eq 0 ] || case "$1" in --*) true;; *) false;; esac; then
          echo "Error: --env-vars requires a space-separated list of variable names" >&2
          exit 1
        fi
        env_vars="$1"
        shift
        ;;
      --sync-files)
        shift
        case "\${1-}" in
          --*|"")
            sync_dir="both"
            ;;
          *)
            sync_dir="$1"
            shift
            ;;
        esac
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage
        ;;
    esac
  done

  case "$sync_dir" in
    both|none|runner-to-vm|vm-to-runner) ;;
    *)
      echo "Invalid sync direction: $sync_dir" >&2
      echo "Valid values are: both, none, runner-to-vm, vm-to-runner" >&2
      exit 1
      ;;
  esac

  case "$sync_dir" in
    both|runner-to-vm) sync_to_vm ;;
  esac

  run_file_in_vm "$run_file" "$env_vars"

  case "$sync_dir" in
    both|vm-to-runner) sync_to_runner ;;
  esac

  if [ "$reboot_after" = true ]; then
    do_reboot
  fi
fi
`

    fs.writeFileSync(cpaShellPath, script, {mode: 0o755})
    core.debug(`Custom shell created at: ${cpaShellPath}`)

    core.addPath(cpaShellDirectory)
  }

  private createSSHConfig(): void {
    if (!fs.existsSync(this.sshDirectory))
      fs.mkdirSync(this.sshDirectory, {recursive: true, mode: 0o700})

    const lines = [
      'StrictHostKeyChecking=accept-new',
      `Host ${this.cpaHost}`,
      `Port ${this.operatingSystem.ssHostPort}`,
      `IdentityFile ${this.privateSshKey}`,
      'SendEnv CI GITHUB_*',
      this.customSendEnv,
      'PasswordAuthentication no'
    ].join('\n')

    fs.appendFileSync(path.join(this.sshDirectory, 'config'), `${lines}\n`)
  }

  private setupAuthorizedKeys(): void {
    const authorizedKeysPath = path.join(this.sshDirectory, 'authorized_keys')
    const publicKeyContent = fs.readFileSync(this.publicSshKey)
    fs.appendFileSync(authorizedKeysPath, publicKeyContent)
  }

  private get publicSshKey(): fs.PathLike {
    return this.action['publicSshKey']
  }

  private get sshDirectory(): string {
    return this.action['sshDirectory']
  }

  private get cpaHost(): string {
    return this.action['cpaHost']
  }

  private get operatingSystem(): os.OperatingSystem {
    return this.action['operatingSystem']
  }

  private get privateSshKey(): fs.PathLike {
    return this.action['privateSshKey']
  }

  private get customSendEnv(): string {
    return this.action['customSendEnv']
  }

  private setupHostname(ipAddress: string): void {
    if (ipAddress === 'localhost') ipAddress = '127.0.0.1'

    execSync(
      `sudo bash -c 'printf "${ipAddress} ${this.cpaHost}\n" >> /etc/hosts'`
    )
  }
}

function escapeForSh(value: string): string {
  return `'${value.split("'").join("'\\''")}'`
}
