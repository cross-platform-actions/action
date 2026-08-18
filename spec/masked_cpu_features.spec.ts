import * as arch from '../src/architectures/factory'
import * as archKind from '../src/architectures/kind'
import {Configuration} from '../src/vm'
import {Host} from '../src/host'
import {Input} from '../src/action/input'
import * as os from '../src/operating_systems/kind'
import {Vm as NetBsdVm} from '../src/operating_systems/netbsd/qemu_vm'
import '../src/operating_systems/netbsd/netbsd'

const host = Host.create('linux')

const configuration: Configuration = {
  memory: '6G',
  cpuCount: 2,
  diskImage: '',
  ssHostPort: 2847,
  cpu: 'max',
  machineType: '',
  resourcesDiskImage: '',
  firmware: ''
}

const architectureFor = (
  kind: archKind.Kind,
  osName: string
): ReturnType<typeof arch.create> =>
  arch.create(kind, host, os.Kind.for(osName), host.hypervisor)

const cpuFlag = (command: string[]): string =>
  command[command.indexOf('-cpu') + 1]

const amxFeatures = ['amx-tile=off', 'amx-int8=off', 'amx-bf16=off']
const la57Feature = 'la57=off'
const stibpAlwaysOnFeature = 'stibp-always-on=off'
const allFeatures = [...amxFeatures, la57Feature, stibpAlwaysOnFeature]

describe('masked CPU features', () => {
  describe('on x86-64', () => {
    const architecture = architectureFor(archKind.Kind.x86_64, 'netbsd')
    const vm = new NetBsdVm(
      '',
      '',
      architecture,
      new Input(host),
      configuration
    )

    it('turns AMX off, because kernels that predate it fault once userland starts', () => {
      amxFeatures.forEach(feature =>
        expect(cpuFlag(vm.command)).toContain(feature)
      )
    })

    it('turns 5-level paging off, because FreeBSD 13.0 panics switching to it', () => {
      expect(cpuFlag(vm.command)).toContain(la57Feature)
    })

    it('turns STIBP always-on mode off, because DragonFly BSD faults writing IA32_SPEC_CTRL', () => {
      expect(cpuFlag(vm.command)).toContain(stibpAlwaysOnFeature)
    })

    it('keeps the CPU model it was configured with', () => {
      expect(cpuFlag(vm.command).split(',')[0]).toEqual('max')
    })
  })

  describe('on arm64', () => {
    const architecture = architectureFor(archKind.Kind.arm64, 'netbsd')
    const vm = new NetBsdVm(
      '',
      '',
      architecture,
      new Input(host),
      configuration
    )

    it('masks nothing, since none of these features exist on ARM', () => {
      allFeatures.forEach(feature =>
        expect(cpuFlag(vm.command)).not.toContain(feature)
      )
    })
  })

  // An operating system that needs a feature of its own masked, the way
  // OpenBSD needs huge pages turned off, must not lose the architecture's
  // mask by saying so.
  describe('for an operating system that masks a feature of its own', () => {
    class VmWithOwnMask extends NetBsdVm {
      protected override get cpuidFlags(): string[] {
        return ['-its-own-feature']
      }
    }

    const architecture = architectureFor(archKind.Kind.x86_64, 'netbsd')
    const vm = new VmWithOwnMask(
      '',
      '',
      architecture,
      new Input(host),
      configuration
    )

    it("masks both that feature and the architecture's", () => {
      expect(cpuFlag(vm.command)).toContain('-its-own-feature')
      allFeatures.forEach(feature =>
        expect(cpuFlag(vm.command)).toContain(feature)
      )
    })
  })
})
