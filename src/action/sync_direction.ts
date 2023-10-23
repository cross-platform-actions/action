export enum SyncDirection {
  runner_to_vm,
  vm_to_runner,
  both,
  none
}

export function toSyncDirection(input: string): SyncDirection | undefined {
  return syncDirectionMap[input.toLowerCase()]
}

const syncDirectionMap: Record<string, SyncDirection> = {
  'runner-to-vm': SyncDirection.runner_to_vm,
  'vm-to-runner': SyncDirection.vm_to_runner,
  true: SyncDirection.both,
  false: SyncDirection.none
} as const

export const validSyncDirections = Object.keys(syncDirectionMap)
