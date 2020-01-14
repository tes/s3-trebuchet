# s3-trebuchet

> Tiny express library to help with s3 uploads and downloads from the browser

## Uploading

To upload successfully to s3 from the browser, every request needs to come with a base64-encoded policy.

The policy generation needs to happen on the server, as we don't want to leak S3 keys on the browser.

s3-trebuchet exposes an express middleware that helps in generating this policy.

## Downloading

If you don't want to allow public access to your s3 bucket, you can allow downloads with temporary generate URLs.

s3-trebuchet exposes an express middleware that helps in generating those temporary URLs.


## Install

```sh
npm install --save s3-trebuchet
```

## Usage

### As an express middleware

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
const file = document.querySelector("#file").files[0];
const params = fetch('/generate-policy'); 
//...
```

