import { api } from './api'

export async function presignAndUpload(file, { purpose, resourceId } = {}) {
  const { upload_url, public_url, key } = await api.post('/uploads/presign/', {
    purpose,
    content_type: file.type,
    size_bytes: file.size,
    ...(resourceId && { resource_id: resourceId }),
  })

  await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  return { public_url, key }
}
