import INubankQueryObject from "../interfaces/INubankQuery.ts"

export default function (): INubankQueryObject {
  const query = `
    {
      viewer {
        id
        savingsAccount {
          id
        }
      }
    }
  `

  return { data: { query }, path: "viewer" }
}
