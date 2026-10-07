import 'dotenv/config'
import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import argon2 from 'argon2'
import { prisma } from '../lib/prisma.js'

function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Execute este comando em um terminal interativo.'))
  }

  return new Promise((resolve, reject) => {
    const input = process.stdin
    const wasRaw = input.isRaw
    let value = ''
    emitKeypressEvents(input)
    input.setRawMode(true)
    input.resume()
    process.stdout.write(prompt)

    const finish = (error?: Error) => {
      input.off('keypress', onKeypress)
      input.setRawMode(wasRaw ?? false)
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }

    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        finish(new Error('Operação cancelada.'))
      } else if (key.name === 'return' || key.name === 'enter') {
        finish()
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1)
      } else if (!key.ctrl && character && character.length === 1) {
        value += character
      }
    }

    input.on('keypress', onKeypress)
  })
}

async function main() {
  const password = await readHidden('Nova senha do admin (entrada oculta): ')
  const confirmation = await readHidden('Confirme a nova senha (entrada oculta): ')
  if (password.length < 10) throw new Error('A senha deve ter pelo menos 10 caracteres.')
  if (password !== confirmation) throw new Error('As senhas não coincidem.')

  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' }, select: { id: true } })
  let email: string | undefined
  if (!existingAdmin) {
    const readline = createInterface({ input: process.stdin, output: process.stdout })
    try {
      email = (await readline.question('Admin ainda não existe. Informe o e-mail para criá-lo: ')).trim()
    } finally {
      readline.close()
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.')
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        email: email!,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      update: { passwordHash },
    })
  })
  console.info('Senha do usuário admin atualizada com segurança.')
}

main()
  .catch(() => {
    console.error('Não foi possível atualizar a senha do admin. Nenhuma senha ou hash foi exibido.')
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
