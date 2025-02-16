

# Tentativa de usar a biblioteca abaixo com deno. Não é possível, pois o deno não suporta certificado de cliente.

# Nubank.TS
Realize operações que você faz no app do nubank pelo node.js Baseado na ([versão python](https://github.com/andreroggeri/pynubank/) que é baseada nessa outra [versão js](https://github.com/Astrocoders/nubank-api))

## Instalação
Instale usando o seu gerenciador de pacotes preferido:

npm: `npm install nubank.ts`
yarn: `yarn add nubank.ts`

> AVISO: Este não é um modulo oficial de Nu Pagamentos S.A, Este modulo utiliza da [API Publica do Nubank](https://twitter.com/nubank/status/766665014161932288)

> AVISO²: Este projeto ainda está em desenvolvimento e podem ocorrer mudanças na estrutura do codigo

# Como obter o certificado:
Para gerar o certificado necessario para autenticar com o nubank, após adicionar o modulo como dependencia do seu projeto execute o seguinte comando
`yarn run nubankts create-cert` e siga o passo a passo, como resultado você terá um certificado `cert.p12` na pasta atual

>⚠️ AVISO ⚠️: tome cuidado com o certificado, usuario e senha da sua conta, não commite-os no github
>Recomendo transformar seu certificado em uma string base64, e armazena-lo no .env, o codigo a seguir mostra como obter o base64, e como utilizar
```typescript
// Transforma o certificado em uma string base64
const cert: string = fs.readFileSync(path.join(__dirname, 'cert.p12'), { encoding: 'base64' });

// Exibe o base64 no console para que você possa copiar o conteúdo e colocar no .env
console.log(cert)

// No seu código, utilize o certificado desta forma:
const certificate = Buffer.from(process.env.NUBANK_CERTIFICATE || '', 'base64');
const nubank = new Nubank(USERNAME, PASSWORD, certificate);
```

# Exemplo de uso
Você pode encontrar mais exemplos [Aqui](/examples/)

Para rodar o exemplo a baixo, é necessario fazer uma validação adicional no certificado para que ele possa realizar transferencias e outras operações que movimentam o saldo na conta, Ações como verificar saldo, gerar e conferir pagamentos pix entre outros que apenas verificam informações na conta não requerem isso e podem ser executadas normalmente com o certificado gerado pelo comando `nubankts create-cert`

```typescript
import Nubank from 'nubank.ts';
import path from 'path';
import fs from 'fs';

const USERNAME = process.env.NUBANK_USERNAME || '';
const PASSWORD = process.env.NUBANK_PASSWORD || '';
const CARD_PASSWORD = process.env.NUBANK_CARD_PASSWORD || '';

const cert = fs.readFileSync(path.join(__dirname, '..', 'cert.p12'));
const nubank = new Nubank(USERNAME, PASSWORD, cert);

async function run(pixKey: string, value: number) {
  const { data } = await nubank.addPixContact(pixKey);

  const account = data.bankAccount;
  const transferOutRequest = await nubank.transferOutPix(account.id, value, CARD_PASSWORD);
  
  const success = transferOutRequest.__typename === 'TransferOutRequestSuccess';
  let error;

  if (!success) {
    console.log(transferOutRequest);
    error = transferOutRequest.errorHandler.description;
  }

  const result = {
    success,
    bank: account.singleBank.number,
    bankName: account.singleBank.shortName,
    agency: account.branch,
    account: account.number,
    digit: account.digit,
    destinatary: account.name,
    error
  };

  console.log(result);
}

run('11999999999', 0.01);
```

Output:
```js
{
  success: true,
  bank: null,
  bankName: 'NEON PAGAMENTOS',
  agency: '0000',
  account: '123456',
  digit: '7',
  destinatary: 'Bruno Bezouro',
  error: undefined
}
```
