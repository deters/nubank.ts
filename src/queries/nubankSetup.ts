import INubankQueryObject from "../interfaces/INubankQuery.ts"

export default function (): INubankQueryObject {
  const query = `
    {
      viewer {
        name
        id
        savingsAccount {
          id
          dict {
            keys(onlyActive: true) {
              id
              value
            }
          }
        }
      }
    }
  `

  return { data: { query }, path: "viewer" }
}
