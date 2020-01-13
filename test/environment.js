import S3rver from 's3rver';
import express from 'express';
import request from 'supertest';
import AWS from 'aws-sdk';
import initS3Trebuchet from '../lib/';

const s3rverConfiguration = {
  accessKeyId: 'S3RVER',
  secretAccessKey: 'S3RVER',
  bucket: 'test-bucket',
  region: 'eu-west-1',
  s3ForcePathStyle: true,
  endpoint: 'http://localhost:4569',
};

const s3 = new AWS.S3(s3rverConfiguration);

const app = express();
const s3Trebuchet = initS3Trebuchet(s3rverConfiguration);
app.put('/test-multipart-params', s3Trebuchet.multipartParamsHandler);
app.put('/test-validate/:fileKey', s3Trebuchet.fileValidationHandler('fileKey'));
app.get(
  '/test-get-file/:fileKey',
  s3Trebuchet.goToTemporaryUrlForFileHandler('fileKey', 'fileName')
);
app.use((err, req, res, next) => {
  return res.status(err.output.statusCode).json(err.output.payload);
});

const s3Client = {
  deleteObject: async (fileKey) => {
    const params = { Bucket: s3rverConfiguration.bucket, Key: fileKey };
    return s3.deleteObject(params).promise();
  },
  putObject: async (fileKey, content) => {
    const params = {
      Bucket: s3rverConfiguration.bucket,
      Key: fileKey,
      Body: content,
      ServerSideEncryption: 'AES256',
    };
    return s3.putObject(params).promise();
  },
  getBucketUrl: () => {
    return `${s3rverConfiguration.endpoint}/${s3rverConfiguration.bucket}`;
  },
};

let s3rver;
before(function(done) {
  s3rver = new S3rver({
    port: 4569,
    hostname: 'localhost',
    silent: false,
    directory: '/tmp/s3rver_test_directory',
    configureBuckets: [{ name: s3rverConfiguration.bucket }],
  }).run(done);
});

after(function(done) {
  s3rver.close(done);
});

module.exports = {
  request: request(app),
  s3Client,
};
