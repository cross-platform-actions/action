import {execWithOutput} from '../src/utility'

test('execWithOutput', async () => {
  const result = await execWithOutput('ls')
  expect(result.length).toBeGreaterThan(0)
})
