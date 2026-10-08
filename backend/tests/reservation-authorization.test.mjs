import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'node:http'
import { createApp } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'
import { setAuthSession } from '../src/services/auth-session.ts'

const reservations = new Map()
let nextReservationId = 1
let baseUrl
let adminCookie
let userCookie
let server
const restoreMocks = []
const errorLogs = []

function replaceMethod(target, name, implementation) {
  const original = target[name]
  target[name] = implementation
  restoreMocks.push(() => { target[name] = original })
}

function applySelect(record, select) {
  if (!record) return null
  if (!select) return { ...record }
  return Object.fromEntries(Object.keys(select).filter((key) => select[key]).map((key) => [key, record[key]]))
}

function futureReservationInput(name = 'Test User') {
  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(futureDate).map(({ type, value }) => [type, value]))
  return {
    userName: name,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    startTime: '10:00',
    endTime: '11:00',
    destination: 'Teste local',
  }
}

async function request(path, { method = 'GET', body, cookie } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

async function createReservation(userName) {
  const response = await request('/api/vehicles/vehicle-test/reservations', {
    method: 'POST',
    body: futureReservationInput(userName),
  })
  assert.equal(response.status, 201)
  return response.json()
}

async function cancelReservation(reservationId, body, cookie) {
  return request(`/api/vehicles/vehicle-test/reservations/${reservationId}/cancel`, {
    method: 'POST',
    body,
    cookie,
  })
}

before(async () => {
  const selectReservation = async ({ where, select }) => {
    const reservation = reservations.get(where.id)
    return applySelect(reservation, select)
  }
  const fakeTransaction = {
    $queryRaw: async () => [],
    vehicle: {
      findUnique: async ({ where }) => where.id === 'vehicle-test' ? { id: 'vehicle-test' } : null,
    },
    reservation: {
      findFirst: async () => null,
      create: async ({ data, select }) => {
        const id = `reservation-${nextReservationId++}`
        const reservation = { id, ...data, createdAt: new Date(), updatedAt: new Date() }
        reservations.set(id, reservation)
        return applySelect(reservation, select)
      },
    },
  }

  replaceMethod(prisma, '$transaction', async (callback) => callback(fakeTransaction))
  replaceMethod(prisma.vehicle, 'findUnique', async ({ where }) => where.id === 'vehicle-test' ? { id: 'vehicle-test' } : null)
  replaceMethod(prisma.user, 'findUnique', async ({ where }) => {
    if (where.id === 'admin-test') return { id: 'admin-test', username: 'admin', email: 'admin@example.test', role: 'ADMIN', status: 'ACTIVE' }
    if (where.id === 'user-test') return { id: 'user-test', username: 'user', email: 'user@example.test', role: 'USER', status: 'ACTIVE' }
    return null
  })
  replaceMethod(prisma.reservation, 'findMany', async ({ select }) => [...reservations.values()].map((item) => applySelect(item, select)))
  replaceMethod(prisma.reservation, 'findUnique', selectReservation)
  replaceMethod(prisma.reservation, 'updateMany', async ({ where, data }) => {
    const reservation = reservations.get(where.id)
    if (!reservation || reservation.vehicleId !== where.vehicleId || reservation.status !== where.status) return { count: 0 }
    Object.assign(reservation, data, { updatedAt: new Date() })
    return { count: 1 }
  })
  replaceMethod(console, 'error', (...values) => errorLogs.push(values.map(String).join(' ')))

  const makeSessionCookie = (userId) => {
    let cookie
    setAuthSession({ setHeader(_name, value) { cookie = value.split(';')[0] } }, userId)
    return cookie
  }
  adminCookie = makeSessionCookie('admin-test')
  userCookie = makeSessionCookie('user-test')

  server = createServer(createApp())
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => {
  reservations.clear()
  errorLogs.length = 0
  nextReservationId = 1
})

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  for (const restore of restoreMocks.reverse()) restore()
  await prisma.$disconnect()
})

test('allows public creation and returns the cancellation token once', async () => {
  const created = await createReservation('Creator')
  assert.equal(created.reservation.userName, 'Creator')
  assert.equal(typeof created.cancelToken, 'string')
  assert.equal(created.cancelToken.length > 30, true)
  assert.equal('cancelTokenHash' in created.reservation, false)
})

test('allows cancellation with the correct token and rejects a wrong token', async () => {
  const created = await createReservation('Creator')
  const wrongTokenResponse = await cancelReservation(created.reservation.id, { cancelToken: 'wrong-token' })
  assert.equal(wrongTokenResponse.status, 403)
  assert.equal(errorLogs.some((line) => line.includes(created.cancelToken)), false)

  const response = await cancelReservation(created.reservation.id, { cancelToken: created.cancelToken })
  assert.equal(response.status, 200)
  const cancelled = await response.json()
  assert.equal(cancelled.status, 'CANCELLED')
  assert.equal('cancelTokenHash' in cancelled, false)
})

test('does not allow cancellation of another reservation without its token', async () => {
  const created = await createReservation('Someone else')
  const response = await cancelReservation(created.reservation.id, {})
  assert.equal(response.status, 403)
})

test('does not allow an authenticated non-admin to cancel without the token', async () => {
  const created = await createReservation('Someone else')
  const response = await cancelReservation(created.reservation.id, {}, userCookie)
  assert.equal(response.status, 403)
})

test('legacy reservations without a token hash can only be cancelled by ADMIN', async () => {
  const created = await createReservation('Legacy creator')
  reservations.get(created.reservation.id).cancelTokenHash = null
  const ownerAttempt = await cancelReservation(created.reservation.id, { cancelToken: created.cancelToken })
  assert.equal(ownerAttempt.status, 403)

  const adminAttempt = await cancelReservation(created.reservation.id, {}, adminCookie)
  assert.equal(adminAttempt.status, 200)
})

test('allows an authenticated ADMIN to cancel without a token', async () => {
  const created = await createReservation('Someone else')
  reservations.get(created.reservation.id).date = new Date('2000-01-01T12:00:00.000Z')
  const response = await cancelReservation(created.reservation.id, {}, adminCookie)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'CANCELLED')
})

test('allows an authenticated ADMIN to cancel an active reservation in progress', async () => {
  const created = await createReservation('Someone else')
  const reservation = reservations.get(created.reservation.id)
  const now = new Date()
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]))
  reservation.date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00.000Z`)
  reservation.startTime = '00:00'

  const response = await cancelReservation(created.reservation.id, {}, adminCookie)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'CANCELLED')
})

test('does not allow cancellation of cancelled, completed, or not-used reservations', async () => {
  const statuses = ['CANCELLED', 'COMPLETED', 'NOT_USED']
  for (const status of statuses) {
    const created = await createReservation('Creator')
    reservations.get(created.reservation.id).status = status
    const response = await cancelReservation(created.reservation.id, { cancelToken: created.cancelToken })
    assert.equal(response.status, 409)
  }
})

test('does not allow cancellation after the reservation start time', async () => {
  const created = await createReservation('Creator')
  const reservation = reservations.get(created.reservation.id)
  reservation.date = new Date('2000-01-01T12:00:00.000Z')
  const response = await cancelReservation(created.reservation.id, { cancelToken: created.cancelToken })
  assert.equal(response.status, 409)
})

test('does not return cancellation tokens or hashes from reservation GET', async () => {
  await createReservation('Creator')
  const response = await request('/api/vehicles/vehicle-test/reservations')
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.length, 1)
  assert.equal('cancelToken' in result[0], false)
  assert.equal('cancelTokenHash' in result[0], false)
})
