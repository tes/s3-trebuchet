# s3-trebuchet

> Tiny express library to help with s3 uploads and downloads initiated from the browser

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

### Using the express middleware

```js
const initS3Trebuchet = require('s3-trebuchet');
const s3rverConfiguration = {
  accessKeyId: 's3-access-key-id',
  secretAccessKey: 's3-secret-access-key',
  bucket: 'bucket',
  region: 'eu-west-1',
};

const s3Trebuchet = initS3Trebuchet(s3rverConfiguration);
app.put('/get-multipart-params', s3Trebuchet.multipartParamsHandler);
app.put('/validate/:fileKey', s3Trebuchet.fileValidationHandler('fileKey'));
app.get('/temporary-url/:fileKey', s3Trebuchet.goToTemporaryUrlForFileHandler('fileKey', 'fileName'));
```

### Client file upload:

```js
const file = document.getElementById('file').files[0]
const response = await fetch('https://server/get-multipart-params', { method: 'PUT' });
const multipartParams = await response.json()
const formData = new FormData();
Object.keys(multipartParams).forEach(key => formData.append(key, multipartParams[key]));
formData.append("file", file);
await fetch(`https://s3-server.aws/bucket/${file.name}`, { method: 'PUT', body: formData });
```

### Client validate upload:

```js
await fetch(`https://server/validate/${fileKey}`, { method: 'PUT' });
```
### Client get temporary URL

```js
await fetch(`https://server/get-temporary-url/${fileKey}`, { method: 'PUT' });
```

You can find an example inside the [example folder](example)

### Configuration 

`initS3Trebuchet(configuration)`


| Option                         | Type                 | Default         | Description
| ------------------------------ | -------------------- | --------------- | -----------
| accessKeyId                    | `string`             |                 | (Required) s3 AccessKey
| secretAccessKey                | `string`             |                 | (Required) s3 SecretAccessKey
| bucket                         | `string`             |                 | (Required) s3 bucket name
| region                         | `string`             | eu-west-1       | s3 region 
| maxFileSize                    | `number`             |                 | Acceptable content length upper limit
| urlExpiryMilliseconds          | `number`             | 1800000         | Default signed urls expiration in ms
| keyPrefix                      | `string`             |                 | Prepended string to the generated key uuid
