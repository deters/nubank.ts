import { Buffer } from "https://deno.land/std/io/buffer.ts"

import Discovery from "./utils/discovery.ts"

import accountBalance from "./queries/accountBalance.ts"
import getAccountId from "./queries/accountId.ts"
import addPixContact from "./queries/addPixContact.ts"
import checkFeed from "./queries/checkFeed.ts"
import feedItems from "./queries/feedItems.ts"
import generatePixQr from "./queries/generatePixQr.ts"
import getContactAccounts from "./queries/getContactAccounts.ts"
import getContacts from "./queries/getContacts.ts"
import getPhoneRechargeDetails from "./queries/getPhoneRechargeDetails.ts"
import getPixAliases from "./queries/getPixAliases.ts"
import getTransferInDetails from "./queries/getTransferInDetails.ts"
import nubankSetup from "./queries/nubankSetup.ts"
import transferOut from "./queries/transferOut.ts"
import transferOutInit from "./queries/transferOutInit.ts"

import type IFeedItems from "./interfaces/IFeedItems.ts"
import type ITransferInDetails from "./interfaces/ITransferInDetails.ts"
import type IGraphQLResponse from "./interfaces/IGraphQLRequest.ts"
import { parseWwwAuthHeader } from "./utils/utils.ts"
import type IPixAddedContact, {
  IContact,
  IContactAccountList,
} from "./interfaces/IContacts.ts"
import type INuAccountID, { IPixAlias } from "./interfaces/IAccount.ts"
import type IPaymentRequest from "./interfaces/IPaymentRequest.ts"

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "X-Correlation-Id": "and-7-0-0",
  "User-Agent": "nubank.ts",
}

interface INubankTS {
  user: string
  password: string
  certificate: Buffer
  discovery: Discovery
  me: IAccountOwner
}

interface IAccountOwner {
  name: string
  id: string
  savingsAccount: {
    id: string
    dict: {
      keys: [
        {
          id: string
          value: string
        }
      ]
    }
  }
}

interface ITransferAuthProof {
  certificatePendingValidationUrl?: string
  verifyPinProof?: string
  location?: string
}

export default class NubankTS implements INubankTS {
  readonly NUBANK_TRANSFERAUTH_HOST = "https://prod-s4-piv.nubank.com.br/"

  user: string
  password: string
  token: string
  certificate: Buffer
  discovery: Discovery
  me: IAccountOwner

  constructor(user: string, password: string, certificatePath: string) {
    this.user = user
    this.password = password

    this.certificate = new Buffer(Deno.readFile(certificatePath))
    this.discovery = new Discovery(fetch)
    this.loadMe()
  }

  async loadMe() {
    const { data } = await this.graphQLRequest<IAccountOwner>(nubankSetup())
    this.me = data
  }

  async getBearerToken() {
    if (!this.token) {
      if (!this.discovery.proxyListAppUrl)
        await this.discovery.updateProxyUrls()
      const { access_token } = await this.NubankPostRequest(
        this.discovery.getAppUrl("token"),
        {
          grant_type: "password",
          client_id: "legacy_client_id",
          client_secret: "legacy_client_secret",
          login: this.user,
          password: this.password,
        }
      )
      this.token = `Bearer ${access_token}`
    }
    return this.token
  }

  async graphQLRequest<T>(
    query: INubankQueryObject,
    bearerToken?: string
  ): Promise<IGraphQLResponse<T>> {
    const Authorization = bearerToken
      ? `Bearer ${bearerToken}`
      : await this.getBearerToken()
    const { data, path } = query

    const response = await this.NubankPostRequest(
      "https://prod-s4-stormshield.nubank.com.br/api/query",
      {
        headers: {
          ...BASE_HEADERS,
          accept: "application/json",
          Authorization,
        },
        body: JSON.stringify(data),
      }
    )

    const responseData = await response.json()
    const pathArr = ["data", ...path.split(".")].reverse()
    while (pathArr.length > 0) {
      const key = pathArr.pop()
      responseData.data = responseData.data[key]
    }

    const keyName =
      responseData.data.__typename === "RequestError" ? "error" : "data"

    return { headers: response.headers, [keyName]: responseData.data }
  }

  async NubankPostRequest(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        accept: "application/json",
        Authorization: await this.getBearerToken(),
      },
      body: JSON.stringify(body),
    })

    return response
  }

  async accountBalance() {
    return await this.graphQLRequest<number>(accountBalance())
  }

  async getAccountId() {
    return await this.graphQLRequest<INuAccountID>(getAccountId())
  }

  async addPixContact(pixKey: string) {
    return await this.graphQLRequest<IPixAddedContact>(addPixContact(pixKey))
  }

  async checkFeed(limit: number) {
    return await this.graphQLRequest(checkFeed(limit))
  }

  async feedItems(cursor?: string) {
    return await this.graphQLRequest<IFeedItems>(feedItems(cursor))
  }

  async generatePixQr(
    amount: number,
    transactionId: string,
    message: string,
    pixAlias?: string
  ) {
    if (!this.me) await this.loadMe()

    if (!this.me.savingsAccount.id) throw new Error("No savings account found")
    if (!this.me.savingsAccount.dict.keys.length)
      throw new Error("No PIX keys found")
    if (
      pixAlias &&
      !this.me.savingsAccount.dict.keys.findIndex(
        (key) => key.value === pixAlias
      )
    )
      throw new Error("PIX key not found")

    const pixKey = pixAlias || this.me.savingsAccount.dict.keys[0].value

    return await this.graphQLRequest<IPaymentRequest>(
      generatePixQr(
        amount,
        transactionId,
        message,
        pixKey,
        this.me.savingsAccount.id
      )
    )
  }

  async getContactAccounts(contactID: string) {
    return await this.graphQLRequest<IContactAccountList>(
      getContactAccounts(contactID)
    )
  }

  async getContacts() {
    return await this.graphQLRequest<IContact[]>(getContacts())
  }

  async getPhoneRechargeDetails(phoneRechargeRequestId: string) {
    return await this.graphQLRequest(
      getPhoneRechargeDetails(phoneRechargeRequestId)
    )
  }

  async getPixAliases() {
    return await this.graphQLRequest<IPixAlias[]>(getPixAliases())
  }

  async getTransferInDetails(id: string) {
    return await this.graphQLRequest<ITransferInDetails>(
      getTransferInDetails(id)
    )
  }

  async rawTransferOut(
    bankAccountId: string,
    amount: number,
    bearerToken: string
  ) {
    return await this.graphQLRequest<ITransferOutRequestSuccess>(
      transferOut(bankAccountId, amount),
      bearerToken
    )
  }

  async transferOutInit(bankAccountId: string, amount: number) {
    try {
      await this.graphQLRequest(transferOutInit(bankAccountId, amount))
    } catch (error) {
      return parseWwwAuthHeader<ITransferAuthProof>(
        error.response.headers.get("www-authenticate")
      )
    }
  }

  async transferOutPix(account: string, value: number, cardPassword: string) {
    if (!this.me) await this.loadMe()
    const proof = await this.transferOutInit(account, value)

    if (!proof.verifyPinProof || !proof.location)
      throw new Error("Certificate pending validation")

    const response = await this.NubankPostRequest(proof.location, {
      acl: [],
      input: cardPassword,
      proof: proof.verifyPinProof,
    })

    const responseData = await response.json()
    const bearerToken = responseData.access_token
    const transferOutResponse = await this.rawTransferOut(
      account,
      value,
      bearerToken
    )

    return transferOutResponse.data || transferOutResponse.error
  }
}
