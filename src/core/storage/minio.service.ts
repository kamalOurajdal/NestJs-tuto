import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import type { AppConfig } from '../config/configuration';

export interface ObjectUploadParams {
  key: string;
  body: Buffer;
  contentType: string;
  size: number;
  metadata?: Record<string, string>;
}

export interface StoredObject {
  bucket: string;
  key: string;
  etag: string;
  url?: string;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly config: ConfigService<AppConfig>) {
    const minioConfig = this.config.getOrThrow<AppConfig['minio']>('minio');
    this.bucket = minioConfig.bucket;
    this.publicBaseUrl = minioConfig.publicBaseUrl;
    this.client = new Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  async uploadObject(params: ObjectUploadParams): Promise<StoredObject> {
    try {
      const uploadInfo = await this.client.putObject(
        this.bucket,
        params.key,
        params.body,
        params.size,
        {
          'Content-Type': params.contentType,
          ...params.metadata,
        },
      );

      return {
        bucket: this.bucket,
        key: params.key,
        etag: uploadInfo.etag,
        url: this.objectUrl(params.key),
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload object ${params.key} to bucket ${this.bucket}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to store uploaded file');
    }
  }

  async removeObject(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.warn(
        `Failed to remove object ${key} from bucket ${this.bucket}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (exists) return;
    await this.client.makeBucket(this.bucket);
    this.logger.log(`Created MinIO bucket ${this.bucket}`);
  }

  private objectUrl(key: string): string | undefined {
    if (!this.publicBaseUrl) return undefined;
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${this.bucket}/${key}`;
  }
}
