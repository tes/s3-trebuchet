import S3rver from 's3rver'; // eslint-disable-line import/no-extraneous-dependencies
import fs from 'fs';
import path from 'path';

new S3rver({
  port: 4569,
  hostname: 'localhost',
  silent: false,
  directory: '/tmp/s3rver_test_directory',
  configureBuckets: [
    { name: 'test-bucket', configs: [fs.readFileSync(path.join(__dirname, 'cors.xml'))] },
  ],
}).run();
