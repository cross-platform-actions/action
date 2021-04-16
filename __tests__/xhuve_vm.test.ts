import * as xhyve from '../src/xhyve_vm'

test('extractIpAddress - finding IP address', () => {
  const ipAddress = '192.168.64.2'
  const macAddress = '4e:70:ef:c2:f2:ed'
  const arpOutput = [
    '? (10.40.0.1) at fc:bd:67:63:12:69 on en0 ifscope [ethernet]',
    '? (10.40.0.4) at 0:50:56:82:34:8a on en0 ifscope [ethernet]',
    '? (10.40.0.9) at 0:50:56:9e:98:51 on en0 ifscope [ethernet]',
    '? (10.40.0.12) at 0:50:56:af:3a:b7 on en0 ifscope [ethernet]',
    '? (10.40.0.64) at 0:50:56:82:67:bd on en0 ifscope [ethernet]',
    '? (10.40.0.83) at 0:50:56:af:bd:60 on en0 ifscope [ethernet]',
    '? (10.40.0.86) at 0:50:56:af:f2:c2 on en0 ifscope [ethernet]',
    '? (10.40.0.89) at 0:50:56:82:de:5a on en0 ifscope [ethernet]',
    '? (10.40.0.112) at 0:50:56:82:1a:74 on en0 ifscope [ethernet]',
    '? (10.40.0.113) at 0:50:56:82:5b:f2 on en0 ifscope [ethernet]',
    '? (10.40.0.116) at 0:50:56:9e:d9:30 on en0 ifscope [ethernet]',
    '? (10.40.0.124) at 0:50:56:82:3a:90 on en0 ifscope [ethernet]',
    '? (10.40.0.127) at ff:ff:ff:ff:ff:ff on en0 ifscope [ethernet]',
    `? (${ipAddress}) at ${macAddress} on bridge100 ifscope [bridge]`,
    '? (224.0.0.251) at 1:0:5e:0:0:fb on en0 ifscope permanent [ethernet]'
  ].join('\n')

  expect(xhyve.extractIpAddress(arpOutput, macAddress)).toBe(ipAddress)
})

test('extractIpAddress - not finding IP address', () => {
  const macAddress = '40:8e:71:34:88:eb'
  const arpOutput = [
    '? (0.0.0.0) at 00:00:00:00:00:00 on en2 ifscope [ethernet]',
    '? (0.0.0.1) at 00:00:00:00:00:01 on en1 ifscope [ethernet]'
  ].join('\n')

  expect(xhyve.extractIpAddress(arpOutput, macAddress)).toBe(undefined)
})
