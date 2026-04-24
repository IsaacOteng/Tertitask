"""
Apply production hardening to Cloudflare R2 buckets:
  1. Set CORS policy on both buckets — only allow requests from the frontend origin.
  2. Print a reminder to disable public bucket listing in the Cloudflare dashboard
     (there is no S3 API equivalent for R2's "Allow Access" toggle).

Usage:
  R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
  R2_PUBLIC_BUCKET=tertitask-public R2_DELIVERIES_BUCKET=tertitask-deliveries \
  FRONTEND_ORIGIN=https://tertitask-web.vercel.app \
  python scripts/r2_harden.py

Or with a .env file:
  python -c "from decouple import AutoConfig; c=AutoConfig(); exec(open('scripts/r2_harden.py').read())"
"""

import json
import os
import sys

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("ERROR: boto3 not installed. Run: pip install boto3")
    sys.exit(1)

ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID", "")
SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
PUBLIC_BUCKET = os.environ.get("R2_PUBLIC_BUCKET", "tertitask-public")
DELIVERIES_BUCKET = os.environ.get("R2_DELIVERIES_BUCKET", "tertitask-deliveries")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "https://tertitask-web.vercel.app")

if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY]):
    print("ERROR: Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars.")
    sys.exit(1)

client = boto3.client(
    "s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name="auto",
)

# CORS rules:
# - Public bucket: allow GET from any origin (images are publicly linked)
#   but restrict PUT (presigned uploads) to the frontend origin only.
# - Deliveries bucket: allow PUT/GET only from the frontend origin.

PUBLIC_BUCKET_CORS = {
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "HEAD"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 86400,
        },
        {
            "AllowedOrigins": [FRONTEND_ORIGIN],
            "AllowedMethods": ["PUT"],
            "AllowedHeaders": ["*", "Content-Type"],
            "MaxAgeSeconds": 300,
        },
    ]
}

DELIVERIES_BUCKET_CORS = {
    "CORSRules": [
        {
            "AllowedOrigins": [FRONTEND_ORIGIN],
            "AllowedMethods": ["PUT", "GET", "HEAD"],
            "AllowedHeaders": ["*", "Content-Type"],
            "MaxAgeSeconds": 300,
        }
    ]
}


def apply_cors(bucket, cors_config, label):
    try:
        client.put_bucket_cors(Bucket=bucket, CORSConfiguration=cors_config)
        print(f"  OK   CORS applied to {label} ({bucket})")
    except ClientError as e:
        print(f"  FAIL CORS on {label} ({bucket}): {e}")
        sys.exit(1)


def verify_cors(bucket, label):
    try:
        resp = client.get_bucket_cors(Bucket=bucket)
        rules = resp.get("CORSRules", [])
        print(f"  OK   Verified {len(rules)} CORS rule(s) on {label} ({bucket})")
    except ClientError as e:
        print(f"  WARN Could not verify CORS on {label}: {e}")


print()
print("R2 bucket hardening")
print(f"  Public bucket:     {PUBLIC_BUCKET}")
print(f"  Deliveries bucket: {DELIVERIES_BUCKET}")
print(f"  Frontend origin:   {FRONTEND_ORIGIN}")
print()

apply_cors(PUBLIC_BUCKET, PUBLIC_BUCKET_CORS, "public bucket")
verify_cors(PUBLIC_BUCKET, "public bucket")

apply_cors(DELIVERIES_BUCKET, DELIVERIES_BUCKET_CORS, "deliveries bucket")
verify_cors(DELIVERIES_BUCKET, "deliveries bucket")

print()
print("Manual steps (no S3 API equivalent in R2):")
print("  1. Cloudflare Dashboard → R2 → tertitask-public")
print("     → Settings → Public Access → ensure 'Allow Access' is OFF")
print("     (The bucket is served via a custom domain, not the r2.dev subdomain)")
print("  2. Cloudflare Dashboard → R2 → tertitask-deliveries")
print("     → Settings → Public Access → ensure 'Allow Access' is OFF")
print("     (Delivery files are served via presigned URLs, never publicly browsable)")
print()
print("Done.")
