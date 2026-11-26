This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Soroban verification hooks

Configure the server-only `SOROBAN_RPC_URL` in `frontend/.env.local`.
The same-origin `POST /api/rpc` route forwards supported JSON-RPC requests to
that endpoint with bounded bodies, a 15-second upstream timeout, and generic
provider errors. Browser callers use `createVerificationRpc()`.

After successful uploads, save the completed CIDs with
`useWizardStore.getState().setVerificationCids(mediaCid, manifestCid)`.
A missing optional manifest is encoded as an empty Soroban String. Changing
the media file clears both CIDs, and changing the manifest clears its CID.
Older persisted content is treated as having no completed CIDs.

`useBuildVerificationTx()` returns a callback that accepts the source Account,
contract ID, network passphrase, and a Stellar `Spec` from the deployed contract.
It returns a `TransactionBuilder` for `request_verification`. Argument order
comes from the spec. CID fields support `media_cid`/`mediaCid` and
`manifest_cid`/`manifestCid`, and must have String types. A declared
`requester` receives the source account address.

Prepare the builder with `prepareVerificationTransaction(builder)` before
passing the resulting transaction to `useSignTransaction().sign(transaction)`.
Preparation runs Soroban simulation through the proxy. Signing checks the
selected Freighter account and network, exposes `isSigning` and `error`,
and returns signed XDR for the caller's submission step.

The current oracle exports `submit_request(BytesN<32>)`, and
`SUMMARY_TYPESCRIPT.md` is absent. Connecting these hooks to the existing
wizard requires a deployed CID-based `request_verification` spec and upload
callbacks that save the returned CIDs.
