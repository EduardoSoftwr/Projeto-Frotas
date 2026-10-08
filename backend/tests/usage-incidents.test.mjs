import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'node:http'
import { createApp } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'

const usages = new Map()
const incidents = new Map()
const emailRequests = []
const restoreMocks = []
const originalFetch = globalThis.fetch
const originalApiKey = process.env.RESEND_API_KEY
const originalEmailFrom = process.env.INCIDENT_EMAIL_FROM
let nextIncidentId = 1
let baseUrl
let server

function replaceMethod(target, name, implementation) {
  const original = target[name]
  target[name] = implementation
  restoreMocks.push(() => { target[name] = original })
}

async function request(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function usageFixture(overrides = {}) {
  return {
    id: 'usage-test',
    vehicleId: 'vehicle-test',
    userName: 'Real User',
    sector: 'Operations',
    destination: 'Warehouse',
    startDateTime: new Date('2026-10-08T09:30:00.000Z'),
    startKm: 1234,
    status: 'IN_USE',
    sessionToken: 'valid-session-secret',
    ...overrides,
  }
}

before(async () => {
  process.env.RESEND_API_KEY = 'test-api-key'
  process.env.INCIDENT_EMAIL_FROM = 'onboarding@resend.dev'

  replaceMethod(prisma.usage, 'findUnique', async ({ where, select }) => {
    const usage = usages.get(where.id)
    if (!usage) return null
    return Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, usage[key]]))
  })
  replaceMethod(prisma.usageIncident, 'create', async ({ data, select }) => {
    const incident = { id: `incident-${nextIncidentId++}`, ...data, createdAt: new Date('2026-10-08T10:15:00.000Z') }
    incidents.set(incident.id, incident)
    return Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, incident[key]]))
  })
  replaceMethod(prisma.user, 'findMany', async ({ where, select }) => [
    { id: 'admin-active', email: 'admin@example.test', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'admin-inactive', email: 'inactive@example.test', role: 'ADMIN', status: 'INACTIVE' },
    { id: 'user-active', email: 'user@example.test', role: 'USER', status: 'ACTIVE' },
  ].filter((user) => user.role === where.role && user.status === where.status)
    .map(({ id, email }) => Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, { id, email }[key]]))))
  replaceMethod(console, 'error', () => {})

  globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url !== 'https://api.resend.com/emails') {
    return originalFetch(input, init)
    }
    emailRequests.push({
      body: JSON.parse(String(init?.body)),
      headers: new Headers(init?.headers ?? input.headers),
    })
    return new Response(JSON.stringify({ id: `resend-${emailRequests.length}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  server = createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => {
  usages.clear()
  incidents.clear()
  emailRequests.length = 0
  nextIncidentId = 1
  usages.set('usage-test', usageFixture())
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  globalThis.fetch = originalFetch
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalApiKey
  if (originalEmailFrom === undefined) delete process.env.INCIDENT_EMAIL_FROM
  else process.env.INCIDENT_EMAIL_FROM = originalEmailFrom
  for (const restore of restoreMocks.reverse()) restore()
})

test('initiating device can create and persist an incident without returning its session token', async () => {
  const response = await request('/api/vehicles/vehicle-test/usage/usage-test/incidents', {
    sessionToken: 'valid-session-secret',
    description: '  Pneu dianteiro perdendo pressão.  ',
    userName: 'Forged User',
    sector: 'Forged Sector',
    destination: 'Forged Destination',
    vehicleId: 'forged-vehicle',
  })
  const responseBody = await response.json()

  assert.equal(response.status, 201)
  assert.equal(incidents.size, 1)
  assert.equal(responseBody.incident.userName, 'Real User')
  assert.equal(responseBody.incident.description, 'Pneu dianteiro perdendo pressão.')
  assert.equal(JSON.stringify(responseBody).includes('valid-session-secret'), false)
  assert.equal(JSON.stringify(responseBody).includes('sessionToken'), false)
  assert.equal(emailRequests.length, 1)
  assert.equal(emailRequests[0].body.to, 'admin@example.test')
  assert.equal(emailRequests[0].body.text.includes('Real User'), true)
  assert.equal(emailRequests[0].body.text.includes('Forged User'), false)
  assert.equal(emailRequests[0].headers.get('idempotency-key'), 'usage-incident-email/incident-1/admin-active')
  const serializedEmail = JSON.stringify(emailRequests[0].body)
  for (const secret of ['valid-session-secret', 'sessionToken', 'password', 'passwordHash', 'test-api-key']) {
    assert.equal(serializedEmail.includes(secret), false)
  }
})

for (const [label, token] of [['missing', undefined], ['incorrect', 'wrong-session-secret']]) {
  test(`${label} session token is rejected without creating or emailing an incident`, async () => {
    const response = await request('/api/vehicles/vehicle-test/usage/usage-test/incidents', {
      ...(token === undefined ? {} : { sessionToken: token }),
      description: 'Observação válida',
    })

    assert.equal(response.status, 403)
    assert.equal(incidents.size, 0)
    assert.equal(emailRequests.length, 0)
  })
}

test('unknown usageId and mismatched vehicleId are rejected', async () => {
  const missingUsage = await request('/api/vehicles/vehicle-test/usage/missing-usage/incidents', {
    sessionToken: 'valid-session-secret',
    description: 'Observação válida',
  })
  const wrongVehicle = await request('/api/vehicles/another-vehicle/usage/usage-test/incidents', {
    sessionToken: 'valid-session-secret',
    description: 'Observação válida',
  })

  assert.equal(missingUsage.status, 404)
  assert.equal(wrongVehicle.status, 404)
  assert.equal(incidents.size, 0)
  assert.equal(emailRequests.length, 0)
})

test('finished usage cannot receive an incident', async () => {
  usages.set('usage-test', usageFixture({ status: 'FINISHED' }))
  const response = await request('/api/vehicles/vehicle-test/usage/usage-test/incidents', {
    sessionToken: 'valid-session-secret',
    description: 'Observação válida',
  })

  assert.equal(response.status, 409)
  assert.equal(incidents.size, 0)
  assert.equal(emailRequests.length, 0)
})

test('blank incident descriptions are rejected', async () => {
  const response = await request('/api/vehicles/vehicle-test/usage/usage-test/incidents', {
    sessionToken: 'valid-session-secret',
    description: '   ',
  })

  assert.equal(response.status, 400)
  assert.equal(incidents.size, 0)
  assert.equal(emailRequests.length, 0)
})

test('email failure returns an error rather than reporting success', async () => {
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    return url === 'https://api.resend.com/emails'
      ? new Response(JSON.stringify({ message: 'Rejected by Resend' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
      : originalFetch(input, init)
  }

  const response = await request('/api/vehicles/vehicle-test/usage/usage-test/incidents', {
    sessionToken: 'valid-session-secret',
    description: 'Observação válida',
  })
  const responseBody = await response.json()

  assert.equal(response.status, 502)
  assert.equal(responseBody.error, 'INCIDENT_EMAIL_FAILED')
  assert.equal(incidents.size, 1)
  assert.equal(JSON.stringify(responseBody).includes('valid-session-secret'), false)
})
