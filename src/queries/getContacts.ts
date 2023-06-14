import INubankQueryObject from "../interfaces/INubankQuery.ts"

export default function (): INubankQueryObject {
  const query = `
    query allContacts {
      viewer {
        savingsAccount {
          contacts {
            id
            name
            isMe
            personIdentifier
            hasNubankAccount
          }
        }
      }
    }
  `

  return { data: { query }, path: "viewer.savingsAccount.contacts" }
}
