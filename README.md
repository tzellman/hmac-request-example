# hmac-request-example

This repository provides a very simple client that can make authenticated
HMAC requests to a server that supports HMAC authorization.

## Usage

First, build the code.

```bash
npm install
npm run build
```

To execute a request with the client, for example:

```bash
node ./lib/client.js get 'https://example.com?param=value' PUBLICKEY PRIVATEKEY --content-type csv
```

You can view the help by passing the `-h` flag to the `client.js` program.

## Docker

You can also build a docker image and run the client app via an ephemoral container.

```bash
docker build -t hmac-request-example .
docker run --rm hmac-request-example get 'https://example.com?param=value' PUBLICKEY PRIVATEKEY --content-type csv > output.csv
```

## License

This project is licensed under the [MIT License](LICENSE.md).
