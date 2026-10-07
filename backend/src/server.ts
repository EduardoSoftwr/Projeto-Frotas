import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3001)

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.')
}

const app = createApp()

app.listen(port, () => {
  console.info(`Backend Carro do G&C ativo na porta ${port}.`)
})