import express from 'express'; // eslint-disable-line import/no-extraneous-dependencies
import path from 'path';
import initS3Trebuchet from '../../lib';
import s3rverConfiguration from '../config';
import '../fake-s3';

const app = express();
const s3Trebuchet = initS3Trebuchet(s3rverConfiguration);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'client.html')));
app.put('/test-multipart-params', s3Trebuchet.multipartParamsHandler);
app.put('/test-validate/:fileKey', s3Trebuchet.fileValidationHandler('fileKey'));
app.get(
  '/test-get-file/:fileKey',
  s3Trebuchet.goToTemporaryUrlForFileHandler('fileKey', 'fileName')
);
app.listen(3000);
