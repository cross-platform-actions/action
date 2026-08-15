import * as fs from 'fs'
import * as path from 'path'

import * as core from '@actions/core'
import * as exec from '@actions/exec'

import * as architecture from './architecture'
import * as vmModule from './vm'
import {Input} from './action/input'
import {Variant, toString as variantToString} from './action/variant'
import {ResourceUrls} from './operating_systems/resource_urls'
import {LinuxDiskFileCreator, LinuxDiskDeviceCreator} from './resource_disk'
import * as hypervisor from './hypervisor'

export interface ExternalVmConfiguration {
  memory: string
  cpuCount: number
}

export interface VmConfiguration extends ExternalVmConfiguration {
  cpuCount: number
  diskImage: fs.PathLike
  resourcesDiskImage: fs.PathLike
}

export abstract class OperatingSystem {
  readonly resourcesUrl: string

  readonly architecture: architecture.Architecture

  private static readonly resourceUrls = ResourceUrls.create()

  private readonly version: string

  constructor(arch: architecture.Architecture, version: string) {
    const hostString = arch.host.toString()
    this.resourcesUrl = `${OperatingSystem.resourceUrls.resourceBaseUrl}/resources-${hostString}.tar`
    this.version = version
    this.architecture = arch
  }

  abstract get virtualMachineImageReleaseVersion(): string
  abstract get hypervisorUrl(): string
  abstract get ssHostPort(): number

  get hypervisor(): hypervisor.Hypervisor {
    return this.architecture.hypervisor
  }

  get virtualMachineImageUrl(): string {
    return [
      OperatingSystem.resourceUrls.baseUrl,
      `${this.name}-builder`,
      'releases',
      'download',
      this.virtualMachineImageReleaseVersion,
      this.imageName
    ].join('/')
  }

  get linuxDiskFileCreator(): LinuxDiskFileCreator {
    return new LinuxDiskFileCreator.NoopDiskFileCreator()
  }

  get linuxDiskDeviceCreator(): LinuxDiskDeviceCreator {
    return new LinuxDiskDeviceCreator.FullDiskDeviceCreator()
  }

  get name(): string {
    return this.constructor.name.toLocaleLowerCase()
  }

  // The number of seconds to wait for the VM to become reachable via SSH.
  get sshReadyTimeout(): number {
    return 240
  }

  // Whether the action generates an SSH key and installs it via the resources
  // disk. When false neither is created, and the image is expected to let its
  // user in without a credential.
  get requiresSshKey(): boolean {
    return true
  }

  get rebootCommand(): string {
    return 'sudo reboot'
  }

  // A POSIX extended regular expression matching the console output a guest
  // produces when its kernel crashes and stops. Haiku, the BSDs and illumos
  // all announce this by starting a line with `panic`, followed by a colon or,
  // on illumos, by the CPU that panicked.
  get consoleCrashPattern(): string {
    return '^[[:space:]]*(PANIC|panic)(:|\\[)'
  }

  // Whether the VM can be rebooted from within (`cpa.sh --reboot`).
  get supportsReboot(): boolean {
    return true
  }

  // The variants this platform has. Every platform has `default`; one that can
  // also boot another way says so here, and only after CI boots it that way.
  get supportedVariants(): Variant[] {
    return [Variant.default]
  }

  // Throws unless this platform has the variant that was asked for. Quietly
  // booting the default instead would hand back something other than what was
  // asked for without saying so.
  validateVariant(variant: Variant): void {
    if (this.supportedVariants.includes(variant)) return

    const supported = this.supportedVariants.map(variantToString).join(', ')

    throw Error(
      `The variant '${variantToString(variant)}' is not supported by ` +
        `${this.name} on ${this.architecture.name}. ` +
        `Supported variants are: ${supported}`
    )
  }

  abstract createVirtualMachine(
    hypervisorDirectory: fs.PathLike,
    resourcesDirectory: fs.PathLike,
    firmwareDirectory: fs.PathLike,
    intput: Input,
    configuration: VmConfiguration
  ): vmModule.Vm

  // The name of the kernel inside a bundled image, and the name it keeps once
  // extracted. Deliberately generic, like the disk's: a builder that starts
  // distributing a bundle needs no code here beyond `imageFileExtension`, and
  // every platform's kernel is found the same way.
  static readonly kernelName = 'kernel'

  // The disk inside a bundled image, named as generically as the kernel is and
  // for the same reason.
  static readonly diskName = 'disk.img'

  // Decided by what the file turned out to be rather than by what this platform
  // publishes today, because `image_url` lets a user supply an image this action
  // never built. Three formats have shipped: qcow2, a bare zstd compressed raw
  // image, and the bundle.
  async prepareDisk(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    switch (await this.imageFormat(diskImage)) {
      case ImageFormat.bundle:
        await this.extractBundle(diskImage, targetDiskName, resourcesDirectory)
        break
      case ImageFormat.compressedRawDisk:
        await this.decompress(diskImage, targetDiskName, resourcesDirectory)
        break
      case ImageFormat.qcow2:
        await this.convertToRaw(diskImage, targetDiskName, resourcesDirectory)
        break
    }
  }

  private async imageFormat(diskImage: fs.PathLike): Promise<ImageFormat> {
    const magic = readPrefix(diskImage, 4)

    if (!magic.equals(zstdMagic)) return ImageFormat.qcow2

    // Both remaining formats are zstd, so the compressed stream has to be
    // opened to tell them apart. A tar names its format at a fixed offset.
    return (await this.isTar(diskImage))
      ? ImageFormat.bundle
      : ImageFormat.compressedRawDisk
  }

  private async isTar(diskImage: fs.PathLike): Promise<boolean> {
    const prefix = path.join(fs.mkdtempSync('/tmp/cpa-image-'), 'prefix')
    // `dd` closes the pipe once it has a block, so zstd decompresses only that
    // much and is then killed; its failure is expected and says nothing.
    const command =
      `zstd -dc '${diskImage.toString()}' 2> /dev/null | ` +
      `dd of='${prefix}' bs=512 count=1 2> /dev/null`

    await exec.exec('/bin/sh', ['-c', command], {ignoreReturnCode: true})

    return readPrefix(prefix, 512)
      .subarray(tarMagicOffset, tarMagicOffset + tarMagic.length)
      .equals(tarMagic)
  }

  // The whole image is the disk, so there is nothing to unpack around it.
  private async decompress(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    core.debug('Decompressing raw disk image')
    const target = path.join(
      resourcesDirectory.toString(),
      targetDiskName.toString()
    )

    await exec.exec('zstd', ['-d', '-f', diskImage.toString(), '-o', target])
  }

  protected get imageFileExtension(): string {
    return 'qcow2'
  }

  // A tar holding a raw `disk.img` and, on the platforms that have one, a
  // `kernel` to boot directly instead of going through firmware and a boot
  // loader. The whole thing is compressed with zstd.
  protected static readonly bundleFileExtension = 'tar.zst'

  // The image is already raw, so it only has to be unpacked, and the holes tar
  // recorded stay holes. The bundle uses zstd's default 128 MiB window, so no
  // `--long` is needed. Piped into tar rather than `tar --zstd`, which not
  // every tar is built with.
  private async extractBundle(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    core.debug('Extracting image bundle')
    const resDir = resourcesDirectory.toString()
    const image = diskImage.toString()
    const command = `zstd -dc ${image} | tar -x -C ${resDir} -f -`

    await exec.exec('/bin/sh', ['-c', command])
    fs.renameSync(
      path.join(resDir, OperatingSystem.diskName),
      path.join(resDir, targetDiskName.toString())
    )
  }

  private async convertToRaw(
    diskImage: fs.PathLike,
    targetDiskName: fs.PathLike,
    resourcesDirectory: fs.PathLike
  ): Promise<void> {
    core.debug('Converting qcow2 image to raw')
    const resDir = resourcesDirectory.toString()
    await exec.exec(path.join(resDir, 'qemu-img'), [
      'convert',
      '-f',
      'qcow2',
      '-O',
      'raw',
      diskImage.toString(),
      path.join(resDir, targetDiskName.toString())
    ])
  }

  private get imageName(): string {
    const encodedVersion = encodeURIComponent(this.version)
    const components = [this.name, encodedVersion, this.architecture.name]
    return `${components.join('-')}.${this.imageFileExtension}`
  }
}

export async function convertToRawDisk(
  diskImage: fs.PathLike,
  targetDiskName: fs.PathLike,
  resourcesDirectory: fs.PathLike
): Promise<void> {
  core.debug('Converting qcow2 image to raw')
  const resDir = resourcesDirectory.toString()
  await exec.exec(path.join(resDir, 'qemu-img'), [
    'convert',
    '-f',
    'qcow2',
    '-O',
    'raw',
    diskImage.toString(),
    path.join(resDir, targetDiskName.toString())
  ])
}

enum ImageFormat {
  qcow2,
  compressedRawDisk,
  bundle
}

const zstdMagic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const tarMagic = Buffer.from('ustar', 'ascii')
const tarMagicOffset = 257

function readPrefix(file: fs.PathLike, length: number): Buffer {
  const buffer = Buffer.alloc(length)
  const descriptor = fs.openSync(file, 'r')

  try {
    fs.readSync(descriptor, buffer, 0, length, 0)
  } finally {
    fs.closeSync(descriptor)
  }

  return buffer
}
