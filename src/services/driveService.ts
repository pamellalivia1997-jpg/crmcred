import { cleanPersonName } from '../utils/formatters';

/**
 * Utility to compress images using HTML5 Canvas client-side.
 * Reduces file size considerably while preserving excellent visual quality.
 * Target email for Google Drive: liviacredconsignado@gmail.com
 */
export async function compressFile(file: File): Promise<Blob | File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension bounding box (1200x1200px for optimal compression)
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG at 0.65 quality to guarantee significant size reduction
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.65
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function findOrCreateFolder(name: string, parentId: string, accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to search folder: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create folder "${name}": ${createRes.statusText}`);
  }

  const folder = await createRes.json();
  return folder.id;
}

export async function getTargetMonthFolderId(accessToken: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString();
  
  const monthNames = [
    '01 - Janeiro', '02 - Fevereiro', '03 - Março', '04 - Abril',
    '05 - Maio', '06 - Junho', '07 - Julho', '08 - Agosto',
    '09 - Setembro', '10 - Outubro', '11 - Novembro', '12 - Dezembro'
  ];
  const month = monthNames[date.getMonth()];

  const rootFolderId = await findOrCreateFolder('LiviaCred_Documentos', 'root', accessToken);
  const yearFolderId = await findOrCreateFolder(year, rootFolderId, accessToken);
  const monthFolderId = await findOrCreateFolder(month, yearFolderId, accessToken);

  return monthFolderId;
}

export async function uploadProposalDocument(
  file: File,
  clientName: string,
  proposalId: string,
  accessToken: string
): Promise<{ webViewLink: string; fileId: string }> {
  // Compress image
  const compressedBlob = await compressFile(file);
  const parentFolderId = await getTargetMonthFolderId(accessToken);

  const cleanClient = cleanPersonName(clientName).toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);
  const cleanOriginalName = file.name.replace(/\s+/g, '_');
  const filename = `${cleanClient}_${proposalId}_${cleanOriginalName}`;

  const metadata = JSON.stringify({
    name: filename,
    parents: [parentFolderId]
  });

  const metadataBlob = new Blob([metadata], { type: 'application/json' });
  const mediaBlob = new Blob([compressedBlob], { type: file.type || 'image/jpeg' });

  const formData = new FormData();
  formData.append('metadata', metadataBlob);
  formData.append('file', mediaBlob);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed: ${errText || uploadRes.statusText}`);
  }

  const uploadedFile = await uploadRes.json();

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (err) {
    console.warn('Could not set permissions for file:', err);
  }

  return {
    webViewLink: uploadedFile.webViewLink,
    fileId: uploadedFile.id
  };
}
