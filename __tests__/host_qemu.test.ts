import * as hostModule from '../src/host'
import HostQemu from '../src/host_qemu'
import {Accelerator} from '../src/vm'

test('accelerator - Linux host', () => {
  const host = hostModule.Host.create(hostModule.Kind.linux)
  const qemu = HostQemu.for(host)

  expect(qemu.accelerator).toBe(Accelerator.tcg)
})

test('accelerator - macOS host', () => {
  const host = hostModule.Host.create(hostModule.Kind.darwin)
  const qemu = HostQemu.for(host)

  expect(qemu.accelerator).toBe(Accelerator.hvf)
})

test('cpu - Linux host', () => {
  const host = hostModule.Host.create(hostModule.Kind.linux)
  const qemu = HostQemu.for(host)

  expect(qemu.cpu).toBe('qemu64')
})

test('cpu - macOS host', () => {
  const host = hostModule.Host.create(hostModule.Kind.darwin)
  const qemu = HostQemu.for(host)

  expect(qemu.cpu).toBe('host')
})
