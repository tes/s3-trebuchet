import uuid from 'uuid/v4';
import { expect } from 'chai';
import { request, s3Client } from './environment';

describe('File upload', () => {
  it('should return multipart params', async () => {
    const expectedKeys = [
      'key',
      'Content-Type',
      'AWSAccessKeyId',
      'policy',
      'redirect',
      'signature',
      'x-amz-server-side-encryption',
    ];
    await request
      .put('/test-multipart-params')
      .expect(200)
      .expect((res) => {
        expect(res.body).to.have.all.keys(expectedKeys);
      });
  });

  describe('validate uploaded file', () => {
    describe('for a valid file', () => {
      const fileKey = `candidate-upload-test-${uuid()}`;
      after(async () => {
        await s3Client.deleteObject(fileKey);
      });

      it('returns 200 when the file was successfully uploaded', async () => {
        await s3Client.putObject(fileKey, 'Here is the body of the file!');
        return request
          .put(`/test-validate/${fileKey}`)
          .expect(200)
          .expect(({ body }) => {
            const uploadedTime = new Date(body.uploadedDate).getTime();
            expect(Number.isNaN(uploadedTime)).to.equal(false);
          });
      });
    });

    describe('for an invalid file', () => {
      const fileKey = `candidate-upload-test-${uuid()}`;
      after(async () => {
        await s3Client.deleteObject(fileKey);
      });

      it('should throw 400 when a file has no content', async () => {
        await s3Client.putObject(fileKey, '');
        await request.put(`/test-validate/${fileKey}`).expect(400);
      });

      it('should return 404 when there is no file', async () => {
        await request.put(`/test-validate/null`).expect(500);
      });
    });
  });
});
