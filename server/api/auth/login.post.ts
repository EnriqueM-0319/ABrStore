import { graphqlRequest } from '../../utils'

const loginMutation = `#graphql
 mutation Login($input: LoginInput!) {
  login(input: $input) {
   id
   fullName
   email
   username
   phone
   role
   active
  }
 }
`

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const username = String(body.username || body.email || '').trim().toLowerCase()
 const password = String(body.password || '')
 const data = await graphqlRequest<{ login: unknown }>(event, loginMutation, {
  input: { username, password }
 })

 return data.login
})
