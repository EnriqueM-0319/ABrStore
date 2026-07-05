import type { HeldTicket } from '~/types'

export function useRecoveredHeldTicket() {
 const recoveredTicket = useState<HeldTicket | null>('held-tickets:recovered-ticket', () => null)

 function setRecoveredTicket(ticket: HeldTicket) {
 recoveredTicket.value = ticket
 }

 function consumeRecoveredTicket() {
 const ticket = recoveredTicket.value
 recoveredTicket.value = null
 return ticket
 }

 return {
 recoveredTicket,
 setRecoveredTicket,
 consumeRecoveredTicket
 }
}
