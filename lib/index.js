const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const debug = require('debug')('s3-trebuchet');
const crypto = require('crypto');
const path = require('path');

const THIRTY_MINUTES_IN_MILLISECONDS = 30 * 60 * 1000;
const DEFAULT_REGION = 'eu-west-1';

const fileUploadSchema = Joi.object({
  ContentLength: Joi.number()
    .min(1)
    .required(),
  LastModified: Joi.date().required(),
}).unknown();

module.exports = ({
  accessKeyId,
  secretAccessKey,
  bucket,
  maxFileSize,
  endpoint,
  region = DEFAULT_REGION,
  urlExpiryMilliseconds = THIRTY_MINUTES_IN_MILLISECONDS,
  s3ForcePathStyle = false,
  keyPrefix = '',
}) => {
  const awsConfig = {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    s3ForcePathStyle,
    ...(endpoint && { endpoint }),
  };

  const s3Client = new AWS.S3(awsConfig);

  const getExpiration = (secondsUntilExpire) => {
    const now = Math.floor(new Date().getTime());
    return new Date(now + secondsUntilExpire).toISOString();
  };

  const getMultipartParams = async () => {
    const key = `${keyPrefix}${uuid()}`;
    const policy = {
      expiration: getExpiration(urlExpiryMilliseconds),
      conditions: [
        { key },
        { bucket },
        ['starts-with', '$name', ''],
        ['starts-with', '$Content-Type', ''],
        ['starts-with', '$Content-Disposition', ''],
        ['content-length-range', 1, maxFileSize],
        { 'x-amz-server-side-encryption': 'AES256' },
        ['starts-with', '$redirect', ''],
      ],
    };

    const base64Policy = Buffer.from(JSON.stringify(policy)).toString('base64');
    const hmac = crypto.createHmac('sha1', secretAccessKey);
    hmac.update(base64Policy);
    const signature = hmac.digest('base64');

    return {
      key,
      signature,
      'Content-Type': '',
      AWSAccessKeyId: accessKeyId,
      policy: base64Policy,
      'x-amz-server-side-encryption': 'AES256',
      redirect: '',
    };
  };

  const multipartParamsHandler = async (req, res) => {
    const multipartParams = await getMultipartParams();
    res
      .status(200)
      .header('Cache-Control', 'private, no-cache, max-age=0, must-revalidate, no-store')
      .send(multipartParams);
  };

  const validateFileUpload = async (fileKey) => {
    const s3ResponseData = await s3Client
      .headObject({
        Bucket: bucket,
        Key: fileKey,
      })
      .promise();

    const { error } = fileUploadSchema.validate(s3ResponseData);
    if (error) {
      debug(error, 'Invalid S3 file uploaded', {
        safeFileKey: fileKey.substr(0, 6),
      });
      throw new Error('The uploaded file has no content');
    }
    return { uploadedDate: s3ResponseData.LastModified };
  };

  const fileValidationHandler = (fileKeyParam) => {
    if (!fileKeyParam) {
      throw new Error('You need to specify which route parameter will contain the fileKey');
    }
    return async (req, res, next) => {
      try {
        const fileKey = req.params[fileKeyParam];
        const result = await validateFileUpload(fileKey);
        res.status(200).send(result);
      } catch (error) {
        debug(`Unable to validate key for upload`);
        const boomError = error.statusCode ? Boom.boomify(error) : Boom.badRequest(error.message);
        next(boomError);
      }
    };
  };

  const getS3Params = ({ fileKey, name, ext, type = 'attachment' }) => {
    const isInlinePdf = ext === '.pdf' && type === 'inline';
    const responseContentDisposition = name && {
      ResponseContentDisposition: `${type}; filename="${name}${ext}"`,
    };
    const contentType = isInlinePdf && {
      ResponseContentType: 'application/pdf',
    };
    return {
      Bucket: bucket,
      Key: fileKey,
      Expires: 300,
      ...responseContentDisposition,
      ...contentType,
    };
  };

  const getFilenameAndExtension = (uri, type) => {
    const fullName = decodeURIComponent(uri);
    const ext = path.extname(fullName);
    const name = path.basename(fullName, ext);
    return {
      name,
      ext,
      type,
    };
  };

  const getTemporaryUrlForFile = async ({ fileKey, fileName, type }) =>
    s3Client.getSignedUrlPromise(
      'getObject',
      getS3Params({
        fileKey,
        ...(fileName && getFilenameAndExtension(fileName, type)),
      })
    );

  const goToTemporaryUrlForFileHandler = (fileKeyParam, fileNameParam) => {
    if (!fileKeyParam) {
      throw new Error('You need to specify which route parameter will contain the fileKey');
    }
    return async (req, res, next) => {
      try {
        const fileKey = req.params[fileKeyParam];
        const fileName = fileNameParam && req.query[fileNameParam];
        const url = await getTemporaryUrlForFile({
          fileKey,
          ...(fileName && { fileName }),
        });
        res.redirect(url);
      } catch (error) {
        debug('Could not get temporary url for file');
        next(Boom.notFound(error));
      }
    };
  };

  return {
    getMultipartParams,
    validateFileUpload,
    getTemporaryUrlForFile,
    multipartParamsHandler,
    fileValidationHandler,
    goToTemporaryUrlForFileHandler,
  };
};
