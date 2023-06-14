import INubankQueryObject from "../interfaces/INubankQuery.ts"

export default function (): INubankQueryObject {
  const query = `
    {
      viewer {
        savingsAccount {
          currentSavingsBalance {
            netAmount
          }
        }
      }
    }
  `

  return {
    data: { query },
    path: "viewer.savingsAccount.currentSavingsBalance.netAmount",
  }
}
