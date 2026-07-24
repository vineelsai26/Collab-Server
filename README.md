# Collab Server

Socket.IO and HTTP backend for the Collab application. It uses Google ID tokens
for authentication and MongoDB for document persistence.

This service was imported from
[`vineelsai26/Collab-Server`](https://github.com/vineelsai26/Collab-Server) at
commit `85f62defe404dbdda47ad6e4bd33269bedb4328b`. The standalone repository is a
downstream public mirror; make source changes here in `vstack`.

## Development

```sh
pnpm install
pnpm build
pnpm start
```

Runtime configuration is supplied through `CLIENT_ID` and `MONGODB_URI`.
