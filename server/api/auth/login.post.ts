import { graphqlRequest } from '../../utils'

const loginMutation = `#graphql
 mutation Login($input: LoginInput!) {
  login(input: $input) {
   id
  }
 }
`

export default defineEventHandler(async (event) => {
 setHeader(event, 'Cache-Control', 'no-store')
 const body = await readBody(event)
 const username = String(body.username || body.email || '').trim().toLowerCase()
 const password = String(body.password || '')
 const data = await graphqlRequest<{ login: unknown }>(event, loginMutation, {
  input: { username, password }
 })

 if (!data.login) {
  throw createError({ statusCode: 401, message: 'Usuario o contraseña incorrectos.' })
 }

 return { ok: true }
})
