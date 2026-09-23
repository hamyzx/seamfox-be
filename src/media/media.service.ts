import { S3 } from 'aws-sdk';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileMimeTypes, FolderNames } from '../lib/enums/media.enum';
import * as mime from 'mime-types';
import { getFileKey } from '../lib/helpers/getFileKey';
import { randomUUID } from 'crypto';
import * as mimeTypes from 'mime-types';

@Injectable()
export class MediaService {
  private readonly s3: S3;
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly configService: ConfigService) {
    const config = {
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: configService.get<string>('AWS_REGION'),
    };

    this.s3 = new S3(config);
  }

  async uploadFile(
    fileName: string,
    fileContent: Buffer,
    folderName: FolderNames = FolderNames.DEFAULT,
    size: number,
  ) {
    const fileKey = getFileKey(fileName, size);
    const params = {
      Bucket: this.configService.get<string>('AWS_BUCKET') as string,
      Key: `${folderName}/${fileKey}`,
      Body: fileContent,
      ContentType: mime.lookup(fileName) as string,
      ACL: 'public-read',
    };
    try {
      const { Key } = await this.s3.upload(params).promise();
      return Key;
    } catch (error) {
      throw new BadRequestException((error as { message: string })?.message);
    }
  }

  async moveFile(newFolderName: string, sourceKey: string) {
    try {
      const key = sourceKey.split('/').slice(1).join('/');
      const newKey = `${newFolderName}/${key}`;

      const params = {
        Bucket: this.configService.get<string>('AWS_BUCKET') as string,
        CopySource: `${this.configService.get<string>('AWS_BUCKET')}/${sourceKey}`,
        Key: newKey,
        ACL: 'public-read',
      };
      console.log(params);

      await this.s3.copyObject(params).promise();

      try {
        await this.deleteFile(sourceKey);
        this.logger.log(`moveFile: deleted original ${sourceKey}`);
      } catch (deleteErr: any) {
        this.logger.warn(
          `moveFile: copy succeeded but delete failed for ${sourceKey} — file will remain in /tmp/. Error: ${deleteErr?.message}`,
        );
      }

      return newKey;
    } catch (error) {
      console.log(error);
      throw new BadRequestException((error as { message: string })?.message);
    }
  }

  async deleteFile(Key: string) {
    try {
      const params = {
        Bucket: this.configService.get<string>('AWS_BUCKET') as string,
        Key,
      };
      await this.s3.deleteObject(params).promise();
    } catch (error: any) {
      const errMsg = error?.message || '';

      if (
        errMsg.includes('s3:DeleteObject') ||
        errMsg.includes('not authorized') ||
        error?.code === 'AccessDenied'
      ) {
        this.logger.warn(
          `deleteFile: permission denied for ${Key} — skipping deletion. IAM policy needs s3:DeleteObject permission.`,
        );
        return;
      }

      throw new BadRequestException(errMsg);
    }
  }

  async signUpload(mime: string, ext?: string, folderName?: FolderNames) {
    try {
      const rawMime = (mime || '').toLowerCase().trim();
      const rawExt = (ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const allowed = new Set<string>([
        FileMimeTypes.PDF,
        FileMimeTypes.DOCX,
        FileMimeTypes.XLSX,
        FileMimeTypes.JPG,
        FileMimeTypes.PNG,
        FileMimeTypes.WEBP,
        FileMimeTypes.MP4,
        FileMimeTypes.MP3,
      ]);

      const mapByExt: Record<string, string> = {
        pdf: FileMimeTypes.PDF,
        docx: FileMimeTypes.DOCX,
        xlsx: FileMimeTypes.XLSX,
        jpg: FileMimeTypes.JPG,
        jpeg: FileMimeTypes.JPG,
        png: FileMimeTypes.PNG,
        webp: FileMimeTypes.WEBP,
        mp4: FileMimeTypes.MP4,
        mp3: FileMimeTypes.MP3,
      };

      let finalMime = rawMime && rawMime !== FileMimeTypes.UNKNOWN ? rawMime : '';
      if (!finalMime && rawExt) finalMime = mapByExt[rawExt] || '';
      if (!finalMime && rawExt) finalMime = (mimeTypes.lookup(rawExt) || '').toString();
      if (!finalMime || !allowed.has(finalMime)) {
        throw new BadRequestException(`mime not allowed: ${finalMime || 'unknown'}`);
      }

      const bucket = this.configService.get<string>('AWS_BUCKET');
      const region = this.configService.get<string>('AWS_REGION');
      if (!bucket || !region) {
        throw new BadRequestException('S3 config missing (AWS_BUCKET / AWS_REGION)');
      }

      const guessedExt = (mimeTypes.extension(finalMime) || '').toString();
      const safeExt = (rawExt || guessedExt || '').replace(/[^a-z0-9]/g, '');
      const dotExt = safeExt ? `.${safeExt}` : '';

      const folder = (folderName || 'chat') as string;
      const yyyyMmDd = new Date().toISOString().slice(0, 10);
      const key = `${folder}/${yyyyMmDd}/${randomUUID()}${dotExt}`;

      const params: S3.Types.PutObjectRequest = {
        Bucket: bucket,
        Key: key,
        ContentType: finalMime,
        ACL: 'public-read',
      };

      const uploadUrl = this.s3.getSignedUrl('putObject', {
        ...params,
        Expires: 60 * 5,
      });

      const cdnBase = this.configService.get<string>('CDN_BASE');
      const url = cdnBase
        ? `${cdnBase.replace(/\/$/, '')}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      return { key, uploadUrl, url, contentType: finalMime };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to sign upload');
    }
  }

  async getFileBuffer(key: string) {
    const params = {
      Bucket: this.configService.get<string>('AWS_BUCKET') as string,
      Key: key,
    };

    const file = await this.s3.getObject(params).promise();
    return file.Body as Buffer;
  }
}