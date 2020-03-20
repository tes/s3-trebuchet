import request from 'superagent'; // eslint-disable-line import/no-unresolved
import initS3Trebuchet from '../../lib';
import s3rverConfiguration from '../config';

(async () => {
  const s3Trebuchet = initS3Trebuchet(s3rverConfiguration);
  const multipartParams = await s3Trebuchet.getMultipartParams();
  try {
    await request
      .post(s3rverConfiguration.endpoint)
      .field(multipartParams)
      .field('name', '')
      .field('Content-Disposition', '')
      .attach('file', './foo.txt');
  } catch (error) {
    console.log(`Error uploading file`, error); // eslint-disable-line no-console
  }
})();
