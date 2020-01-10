# s3-trebuchet

> Tiny library to validate and get temporary urls for s3 uploads

## Reasoning

To upload successfully to s3 from the browser, every request needs to come with a base64-encoded policy.

The policy generation needs to happen on the server, as we don't want to leak S3 keys on the browser.

This library exposes an express middleware, `multipartParamsHandler` that can be plugged on an express route to help generate this policy.

## Install

```sh
npm install --save s3-trebuchet
```

## Usage

### Configure the library

```js
const s3rverConfiguration = {
  accessKeyId: 's3-access-key-id',
  secretAccessKey: 's3-secret-access-key',
  bucket: 'bucket',
  region: 'eu-west-1',
};

const s3Trebuchet = initS3Trebuchet(s3rverConfiguration);
app.put('/generate-policy', s3Trebuchet.multipartParamsHandler);
```

Then on the client:
```js
const params = fetch('/generate-policy'); 
const formData = new FormData();
```


