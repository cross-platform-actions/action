import {Factory} from './operating_systems/factory'
import {Kind, Hypervisor, toHypervisor} from './hypervisor'

export function get(kind: Kind | null, factory: Factory): Hypervisor {
  if (!kind) return factory.defaultHypervisor

  factory.validateHypervisor(kind)
  const hypervisorClass = toHypervisor(kind)
  return new hypervisorClass()
}
