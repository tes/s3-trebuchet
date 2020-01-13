import uuid from 'uuid/v4';
import { expect } from 'chai';
import path from 'path';
import superagent from 'superagent';
import httpStatusCodes from 'http-status-codes';
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
      .expect(httpStatusCodes.OK)
      .expect((res) => {
        expect(res.body).to.have.all.keys(expectedKeys);
      });
  });

  it('should be able to upload a file with the generated policy', async () => {
    const { body } = await request.put('/test-multipart-params');
    const res = await superagent
      .post(s3Client.getBucketUrl())
      .attach('file', path.join(__dirname, 'test.txt'))
      .field(body);
    expect(res.status).to.equal(httpStatusCodes.CREATED);
  });

  describe('get uploaded file', () => {
    it('should redirect for a valid file', async () => {
      const fileKey = `upload-test-${uuid()}`;
      await s3Client.putObject(fileKey, 'Here is the body of the file!');
      const {
        headers: { location },
      } = await request.get(`/test-get-file/${fileKey}`).expect(httpStatusCodes.MOVED_TEMPORARILY);
      const res = await superagent(location);
      console.log(res.statusCode);
    });

    it('should 404 for a non existing fileKey', async () => {
      const {
        headers: { location },
      } = await request.get(`/test-get-file/null`).expect(httpStatusCodes.MOVED_TEMPORARILY);
      return superagent(location).catch(({ response: { statusCode } }) =>
        expect(statusCode).to.equal(httpStatusCodes.NOT_FOUND)
      );
    });

    it('should add the attachment file name if specified', async () => {
      const fileKey = `upload-test-${uuid()}`;
      const response = await request
        .get(`/test-get-file/${fileKey}?fileName=attachment.pdf`)
        .expect(httpStatusCodes.MOVED_TEMPORARILY);
      expect(response.header.location)
        .to.be.a('string')
        .and.match(/test-bucket\/upload-test-/);
      expect(response.header.location)
        .to.be.a('string')
        .and.match(/attachment\.pdf/);
      expect(response.status).to.equal(httpStatusCodes.MOVED_TEMPORARILY);
    });
  });

  describe('validate uploaded file', () => {
    describe('for a valid file', () => {
      const fileKey = `upload-test-${uuid()}`;
      after(async () => {
        await s3Client.deleteObject(fileKey);
      });

      it('returns 200 when the file was successfully uploaded', async () => {
        await s3Client.putObject(fileKey, 'Here is the body of the file!');
        return request
          .put(`/test-validate/${fileKey}`)
          .expect(httpStatusCodes.OK)
          .expect(({ body }) => {
            const uploadedTime = new Date(body.uploadedDate).getTime();
            expect(Number.isNaN(uploadedTime)).to.equal(false);
          });
      });
    });

    describe('for an invalid file', () => {
      const fileKey = `upload-test-${uuid()}`;
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
