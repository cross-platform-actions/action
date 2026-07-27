import {CpuSource, HostCpu} from '../src/host_cpu'

const source = (...models: string[]): CpuSource => ({
  cpus: () => models.map(model => ({model}))
})

describe('HostCpu', () => {
  describe('toString', () => {
    it('reports the model and the number of vCPUs', () => {
      const cpu = new HostCpu(
        source(
          'AMD EPYC 9V74 80-Core Processor',
          'AMD EPYC 9V74 80-Core Processor'
        )
      )

      expect(`${cpu}`).toEqual('AMD EPYC 9V74 80-Core Processor (2 vCPUs)')
    })

    it('strips the padding some platforms add to the model', () => {
      const cpu = new HostCpu(source('AMD EPYC 7763 64-Core Processor      '))

      expect(`${cpu}`).toEqual('AMD EPYC 7763 64-Core Processor (1 vCPUs)')
    })

    it('reports an unknown model when the model is blank', () => {
      expect(`${new HostCpu(source('   '))}`).toEqual('unknown (1 vCPUs)')
    })

    it('reports an unknown model when no CPUs are reported', () => {
      expect(`${new HostCpu(source())}`).toEqual('unknown (0 vCPUs)')
    })
  })
})
