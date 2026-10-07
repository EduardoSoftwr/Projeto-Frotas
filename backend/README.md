# Backend Carro do G&C

API Express isolada do frontend. O frontend e o `localStorage` permanecem inalterados nesta etapa.

## Configuração local

1. Instale e inicie o PostgreSQL.
2. Crie um banco vazio para o projeto.
3. Copie `.env.example` para `.env` dentro desta pasta e preencha `DATABASE_URL` com a conexão criada no seu ambiente. Não compartilhe esse arquivo.
4. Execute `npm run prisma:generate`, `npm run prisma:migrate` e `npm run prisma:seed`.

Não há credenciais PostgreSQL fornecidas ou presumidas neste repositório.

## Comandos

Execute dentro de `backend/`:

- `npm run dev`: servidor em modo de desenvolvimento.
- `npm run build`: compila TypeScript em `dist/`.
- `npm run start`: inicia a versão compilada.
- `npm run prisma:migrate`: cria/aplica migrações no PostgreSQL configurado.
- `npm run prisma:generate`: gera o Prisma Client.
- `npm run prisma:seed`: garante que o veículo inicial exista.

O seed usa `upsert` sem atualizar um veículo existente, portanto não reseta status nem quilometragem em execuções posteriores.

## API inicial

`GET /api/health` retorna `{ "status": "ok" }`. O CORS permite a origem configurada em `FRONTEND_URL`.

## Endpoints de veículos e reservas

Os endpoints abaixo já estão disponíveis:

- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `GET /api/vehicles/:id/current-usage`
- `POST /api/vehicles/:id/usage/start`
- `POST /api/vehicles/:id/usage/:usageId/finish`
- `GET /api/vehicles/:id/reservations`
- `POST /api/vehicles/:id/reservations`
- `POST /api/vehicles/:id/reservations/:reservationId/cancel`

As operações de uso e reserva respeitam o estado do banco como fonte oficial. Inícios, finalizações e criações de reserva bloqueiam a linha do veículo durante a transação para serializar alterações concorrentes. Uma migration adicional cria um índice único parcial para impedir mais de uma utilização `IN_USE` por veículo. Reservas são serializadas pela API por veículo; escritores externos à API não ficam cobertos por uma constraint de exclusão de intervalos. Consultas de utilização atual nunca retornam `sessionToken`; o token só é entregue na resposta do início e é exigido no encerramento.

Este backend é uma base de desenvolvimento. O `passwordHash` está previsto no schema, mas autenticação, geração de hash, autorização administrativa e endpoints operacionais ainda não foram implementados.
