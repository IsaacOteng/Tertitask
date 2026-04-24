import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings


def _get_client():
    return boto3.client(
        's3',
        endpoint_url=f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name='auto',
    )


def generate_presigned_put(bucket, key, content_type, size_bytes, expires=300):
    client = _get_client()
    url = client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ContentType': content_type,
            'ContentLength': size_bytes,
        },
        ExpiresIn=expires,
        HttpMethod='PUT',
    )
    return url
